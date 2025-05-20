// src/mastra/tools/diffParser.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import parseDiff from "parse-diff";

export const diffParser = createTool({
  id: "diff-parser",
  description: "解析Git差异(diff)内容，提取文件变更信息",
  inputSchema: z.object({
    diffContent: z.string().describe("Git diff格式的代码变更内容"),
  }),
  outputSchema: z.object({
    files: z.array(
      z.object({
        filename: z.string(),
        oldFilename: z.string().optional(),
        language: z.string().optional(),
        additions: z.number(),
        deletions: z.number(),
        changes: z.array(
          z.object({
            type: z.enum(["add", "del", "normal"]),
            content: z.string(),
            lineNumber: z.number().optional(),
          })
        ),
      })
    ),
    summary: z.object({
      totalFiles: z.number(),
      totalAdditions: z.number(),
      totalDeletions: z.number(),
    }),
  }),
  execute: async (params, options) => {
    try {
      // 解析diff内容
      const diffContent = params.context.diffContent;
      const files = parseDiff(diffContent);
      
      // 处理解析结果，构建结构化输出
      const processedFiles = files.map(file => {
        // 尝试从文件名确定语言
        const extension = file.to?.split('.').pop() || '';
        const languageMap: {[key: string]: string} = {
          'js': 'JavaScript',
          'ts': 'TypeScript',
          'py': 'Python',
          'java': 'Java',
          'rb': 'Ruby',
          'go': 'Go',
          'php': 'PHP',
          'cs': 'C#',
          'cpp': 'C++',
          'c': 'C',
          // 可以根据需要添加更多语言映射
        };
        
        const language = languageMap[extension] || 'Unknown';
        
        // 计算添加和删除的行数
        let additions = 0;
        let deletions = 0;
        const changes: Array<{
          type: "add" | "del" | "normal";
          content: string;
          lineNumber?: number;
        }> = [];
        
        for (const chunk of file.chunks || []) {
          for (const change of chunk.changes || []) {
            if (change.type === 'add') {
              additions++;
            } else if (change.type === 'del') {
              deletions++;
            }
            
            // 根据change类型获取行号
            let lineNumber;
            if (change.type === 'add' && 'ln' in change) {
              lineNumber = change.ln;
            } else if (change.type === 'del' && 'ln' in change) {
              lineNumber = change.ln;
            } else if (change.type === 'normal' && 'ln1' in change) {
              lineNumber = change.ln1; // 对于normal类型，使用起始行号
            }
            
            changes.push({
              type: change.type as "add" | "del" | "normal",
              content: change.content,
              lineNumber: lineNumber,
            });
          }
        }
        
        return {
          filename: file.to || '',
          oldFilename: file.from !== file.to ? file.from : undefined,
          language,
          additions,
          deletions,
          changes,
        };
      });
      
      // 计算总体统计信息
      const totalAdditions = processedFiles.reduce((sum, file) => sum + file.additions, 0);
      const totalDeletions = processedFiles.reduce((sum, file) => sum + file.deletions, 0);
      
      return {
        files: processedFiles,
        summary: {
          totalFiles: files.length,
          totalAdditions,
          totalDeletions,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`解析diff内容失败: ${errorMessage}`);
    }
  },
});