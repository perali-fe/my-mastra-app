// src/mastra/tools/codeAnalyzer.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const codeAnalyzer = createTool({
  id: "code-analyzer",
  description: "对代码变更进行初步分析，识别潜在问题",
  inputSchema: z.object({
    files: z.array(
      z.object({
        filename: z.string(),
        language: z.string().optional(),
        changes: z.array(
          z.object({
            type: z.enum(["add", "del", "normal"]),
            content: z.string(),
            lineNumber: z.number().optional(),
          })
        ),
      })
    ),
  }),
  outputSchema: z.object({
    issues: z.array(
      z.object({
        filename: z.string(),
        lineNumber: z.number().optional(),
        severity: z.enum(["info", "warning", "error"]),
        message: z.string(),
        type: z.string(),
      })
    ),
    suggestions: z.array(z.string()),
  }),
  execute: async (params, options) => {
    const issues: Array<{
      filename: string;
      lineNumber?: number;
      severity: "info" | "warning" | "error";
      message: string;
      type: string;
    }> = [];
    const suggestions = new Set<string>();
    
    // 遍历每个文件变更
    for (const file of params.context.files) {
      const { filename, language, changes } = file;
      
      // 根据文件类型应用不同的启发式规则
      if (language === 'JavaScript' || language === 'TypeScript') {
        // JavaScript/TypeScript特定规则
        for (const change of changes) {
          if (change.type === 'add') {
            const content = change.content;
            const lineNumber = change.lineNumber;
            
            // 检查常见问题：console.log 语句
            if (content.includes('console.log')) {
              issues.push({
                filename,
                lineNumber,
                severity: "warning" as "info" | "warning" | "error",
                message: '代码中包含console.log语句，生产环境中应移除',
                type: 'debug-code',
              });
            }
            
            // 检查潜在的安全问题：eval 使用
            if (content.includes('eval(')) {
              issues.push({
                filename,
                lineNumber,
                severity: "error" as "info" | "warning" | "error",
                message: '使用了eval函数，可能导致安全风险',
                type: 'security',
              });
            }
            
            // 检查大块注释掉的代码
            if (content.startsWith('//') && content.length > 50) {
              issues.push({
                filename,
                lineNumber,
                severity: "info" as "info" | "warning" | "error",
                message: '存在大块注释代码，建议移除未使用代码',
                type: 'code-quality',
              });
            }
          }
        }
        
        // 添加JavaScript/TypeScript特定建议
        suggestions.add('考虑使用ESLint和Prettier保持代码风格一致');
        suggestions.add('对于复杂函数，考虑添加JSDoc文档');
      } else if (language === 'Python') {
        // Python特定规则
        for (const change of changes) {
          if (change.type === 'add') {
            const content = change.content;
            const lineNumber = change.lineNumber;
            
            // 检查print语句
            if (content.includes('print(')) {
              issues.push({
                filename,
                lineNumber,
                severity: "info" as "info" | "warning" | "error",
                message: '代码中包含print语句，生产环境中应使用日志',
                type: 'debug-code',
              });
            }
            
            // 检查异常捕获
            if (content.includes('except:') && !content.includes('except ')) {
              issues.push({
                filename,
                lineNumber,
                severity: "warning" as "info" | "warning" | "error",
                message: '使用了通用异常捕获，应指定具体异常类型',
                type: 'error-handling',
              });
            }
          }
        }
        
        // 添加Python特定建议
        suggestions.add('考虑使用Black或YAPF格式化Python代码');
        suggestions.add('使用类型提示(Type Hints)增强代码可读性');
      }
      
      // 通用规则（适用于所有语言）
      const linesAdded = changes.filter(c => c.type === 'add').length;
      if (linesAdded > 300) {
        issues.push({
          filename,
          severity: "warning" as "info" | "warning" | "error",
          message: `此文件添加了大量代码(${linesAdded}行)，建议拆分为更小的提交`,
          type: 'code-review-practice',
        });
        
        suggestions.add('考虑将大型变更拆分为多个小型提交，便于审查');
      }
    }
    
    return {
      issues,
      suggestions: Array.from(suggestions),
    };
  },
});