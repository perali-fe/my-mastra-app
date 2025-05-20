// src/mastra/tools/repoContext.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';

export const repoContext = createTool({
  id: "repo-context",
  description: "获取代码仓库的上下文信息，如项目类型、语言、框架等",
  inputSchema: z.object({
    repoPath: z.string().describe("代码仓库本地路径"),
  }),
  outputSchema: z.object({
    projectType: z.string(),
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    packageInfo: z.record(z.any()).optional(),
    configFiles: z.array(z.string()),
  }),
  execute: async (params, options) => {
    try {
      const repoPath = params.context.repoPath;
      
      // 检查路径是否存在
      if (!fs.existsSync(repoPath)) {
        throw new Error(`路径不存在: ${repoPath}`);
      }
      
      // 分析项目类型和使用的语言/框架
      const languages = new Set<string>();
      const frameworks = new Set<string>();
      const configFiles = new Set<string>();
      let projectType = 'Unknown';
      let packageInfo = {};
      
      // 检查package.json（Node.js项目）
      const packageJsonPath = path.join(repoPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        projectType = 'Node.js';
        languages.add('JavaScript/TypeScript');
        
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageInfo = packageData;
        
        // 根据依赖识别框架
        const allDeps = {
          ...(packageData.dependencies || {}),
          ...(packageData.devDependencies || {})
        };
        
        if (allDeps.react) frameworks.add('React');
        if (allDeps.vue) frameworks.add('Vue');
        if (allDeps.angular) frameworks.add('Angular');
        if (allDeps.express) frameworks.add('Express');
        if (allDeps.next) frameworks.add('Next.js');
        if (allDeps.nuxt) frameworks.add('Nuxt.js');
        if (allDeps.gatsby) frameworks.add('Gatsby');
        if (allDeps["@nestjs/core"]) frameworks.add('NestJS');
        if (allDeps.mastra) frameworks.add('Mastra');
      }
      
      // 检查requirements.txt（Python项目）
      const requirementsPath = path.join(repoPath, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        projectType = 'Python';
        languages.add('Python');
        
        const requirements = fs.readFileSync(requirementsPath, 'utf8');
        if (requirements.includes('django')) frameworks.add('Django');
        if (requirements.includes('flask')) frameworks.add('Flask');
        if (requirements.includes('fastapi')) frameworks.add('FastAPI');
      }
      
      // 检查pom.xml（Java Maven项目）
      const pomPath = path.join(repoPath, 'pom.xml');
      if (fs.existsSync(pomPath)) {
        projectType = 'Java';
        languages.add('Java');
        
        const pom = fs.readFileSync(pomPath, 'utf8');
        if (pom.includes('spring-boot')) frameworks.add('Spring Boot');
        if (pom.includes('spring-framework')) frameworks.add('Spring Framework');
      }
      
      // 检查配置文件
      const commonConfigFiles = [
        '.eslintrc', '.prettier', 'tsconfig.json', '.editorconfig',
        '.gitignore', 'jest.config.js', 'babel.config.js', 'webpack.config.js'
      ];
      
      commonConfigFiles.forEach(file => {
        const filePath = path.join(repoPath, file);
        if (fs.existsSync(filePath)) {
          configFiles.add(file);
        }
      });
      
      return {
        projectType,
        languages: Array.from(languages),
        frameworks: Array.from(frameworks),
        packageInfo,
        configFiles: Array.from(configFiles)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`获取仓库上下文失败: ${errorMessage}`);
    }
  },
});