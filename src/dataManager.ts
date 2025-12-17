import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface DataFile {
  path: string;
  name: string;
  data: any;
  isValid: boolean;
  error?: string;
}

export class DataManager {
  private dataCache: Map<string, DataFile> = new Map();
  // Maximum JSON file size: 10MB
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  /**
   * Validate that a file path is safe and within allowed directories
   */
  private validatePath(filePath: string, workspacePath?: string): boolean {
    try {
      const resolvedPath = path.resolve(filePath);
      
      // Check if the file exists and is a file (not a directory or symlink)
      const stats = fs.lstatSync(resolvedPath);
      if (!stats.isFile()) {
        return false;
      }
      
      // Check file size
      if (stats.size > this.MAX_FILE_SIZE) {
        return false;
      }
      
      // Ensure the file is a JSON file
      if (!resolvedPath.toLowerCase().endsWith('.json')) {
        return false;
      }
      
      // If a workspace path is provided, ensure the file is within the workspace
      if (workspacePath) {
        const resolvedWorkspace = path.resolve(workspacePath);
        const relativePath = path.relative(resolvedWorkspace, resolvedPath);
        
        // Empty string or '.' means the file is in the workspace root, which is allowed
        // If the relative path starts with .. or is an absolute path, it's outside the workspace
        if (relativePath !== '' && relativePath !== '.' && 
            (relativePath.startsWith('..') || path.isAbsolute(relativePath))) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Auto-detect data files for a given HTML/template file
   * Looks for files like: filename.data.json, filename-*.data.json, filename.context.json
   */
  async autoDetectDataFiles(htmlFilePath: string): Promise<DataFile[]> {
    const dir = path.dirname(htmlFilePath);
    const basename = path.basename(htmlFilePath, path.extname(htmlFilePath));
    const dataFiles: DataFile[] = [];

    try {
      // Read all files in the directory
      const files = fs.readdirSync(dir);
      
      // Filter for relevant data files
      const dataFileNames = files.filter(file => {
        const lowerFile = file.toLowerCase();
        // Match exact: basename.data.json, basename.context.json
        // Match pattern: basename-*.data.json, basename-*.context.json
        return (
          file === `${basename}.data.json` ||
          file === `${basename}.context.json` ||
          file === `${basename}.json` ||
          (file.startsWith(`${basename}-`) && (lowerFile.endsWith('.data.json') || lowerFile.endsWith('.context.json'))) ||
          file === 'data.json' ||
          file === 'context.json'
        );
      });

      // Load each data file
      for (const fileName of dataFileNames) {
        const dataFilePath = path.join(dir, fileName);
        
        try {
          const dataFile = await this.loadDataFile(dataFilePath, dir);
          if (dataFile) {
            dataFiles.push(dataFile);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      // Directory read error, return empty array
    }

    return dataFiles;
  }

  /**
   * Load and parse a JSON data file
   */
  async loadDataFile(filePath: string, workspacePath?: string): Promise<DataFile | null> {
    // Validate path first
    if (!this.validatePath(filePath, workspacePath)) {
      const dataFile: DataFile = {
        path: filePath,
        name: path.basename(filePath),
        data: {},
        isValid: false,
        error: 'Invalid file path or file too large',
      };
      return dataFile;
    }
    
    // Check cache first
    const cached = this.dataCache.get(filePath);
    if (cached) {
      return cached;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Validate content size
      if (content.length > this.MAX_FILE_SIZE) {
        throw new Error('File content too large');
      }
      
      const data = JSON.parse(content);
      
      // Validate that parsed data is an object (not an array, not null)
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('JSON data must be an object, not an array');
      }
      
      const dataFile: DataFile = {
        path: filePath,
        name: path.basename(filePath),
        data,
        isValid: true,
      };

      this.dataCache.set(filePath, dataFile);
      return dataFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const dataFile: DataFile = {
        path: filePath,
        name: path.basename(filePath),
        data: {},
        isValid: false,
        error: `Failed to parse JSON: ${errorMessage}`,
      };

      return dataFile;
    }
  }

  /**
   * Find all JSON files in the workspace
   */
  async findDataFilesInWorkspace(workspaceFolder: string): Promise<DataFile[]> {
    const dataFiles: DataFile[] = [];
    
    try {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, '**/*.json'),
        '**/node_modules/**',
        50 // Limit to 50 files
      );

      for (const file of files) {
        const dataFile = await this.loadDataFile(file.fsPath);
        if (dataFile && dataFile.isValid) {
          dataFiles.push(dataFile);
        }
      }
    } catch (error) {
      // Silently fail
    }

    return dataFiles;
  }

  /**
   * Validate that data contains required variables
   */
  validateData(data: any, requiredVariables: string[]): {
    valid: boolean;
    missing: string[];
    present: string[];
  } {
    const missing: string[] = [];
    const present: string[] = [];

    for (const varName of requiredVariables) {
      if (varName in data) {
        present.push(varName);
      } else {
        missing.push(varName);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      present,
    };
  }

  /**
   * Find unused data properties (properties in data not used in template)
   */
  findUnusedProperties(data: any, usedVariables: string[]): string[] {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const dataKeys = Object.keys(data);
    const unused: string[] = [];

    for (const key of dataKeys) {
      if (!usedVariables.includes(key)) {
        unused.push(key);
      }
    }

    return unused;
  }

  /**
   * Generate sample data based on template variables
   */
  generateSampleData(variables: string[]): any {
    const sampleData: any = {};

    for (const varName of variables) {
      // Generate sample values based on common variable names
      if (varName.includes('name')) {
        sampleData[varName] = 'John Doe';
      } else if (varName.includes('email')) {
        sampleData[varName] = 'john.doe@example.com';
      } else if (varName.includes('date')) {
        sampleData[varName] = new Date().toISOString();
      } else if (varName.includes('price') || varName.includes('amount') || varName.includes('total')) {
        sampleData[varName] = 99.99;
      } else if (varName.includes('url') || varName.includes('link')) {
        sampleData[varName] = 'https://example.com';
      } else if (varName.includes('count') || varName.includes('quantity')) {
        sampleData[varName] = 1;
      } else if (varName === 'items' || varName.includes('list')) {
        sampleData[varName] = [
          { name: 'Item 1', value: 'Value 1' },
          { name: 'Item 2', value: 'Value 2' },
        ];
      } else {
        sampleData[varName] = `Sample ${varName}`;
      }
    }

    return sampleData;
  }

  /**
   * Save data to a JSON file
   */
  async saveDataFile(filePath: string, data: any, workspacePath?: string): Promise<boolean> {
    try {
      const resolvedPath = path.resolve(filePath);
      
      // Ensure the file is a JSON file
      if (!resolvedPath.toLowerCase().endsWith('.json')) {
        return false;
      }
      
      // If a workspace path is provided, ensure the file is within the workspace
      if (workspacePath) {
        const resolvedWorkspace = path.resolve(workspacePath);
        const relativePath = path.relative(resolvedWorkspace, resolvedPath);
        
        // Empty string or '.' means the file is in the workspace root, which is allowed
        // If the relative path starts with .. or is an absolute path, it's outside the workspace
        if (relativePath !== '' && relativePath !== '.' && 
            (relativePath.startsWith('..') || path.isAbsolute(relativePath))) {
          return false;
        }
      }
      
      // Validate that data is an object (not an array, not null)
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return false;
      }
      
      const json = JSON.stringify(data, null, 2);
      
      // Check size limit
      if (json.length > this.MAX_FILE_SIZE) {
        return false;
      }
      
      fs.writeFileSync(resolvedPath, json, 'utf8');
      
      // Update cache
      const dataFile: DataFile = {
        path: resolvedPath,
        name: path.basename(resolvedPath),
        data,
        isValid: true,
      };
      this.dataCache.set(resolvedPath, dataFile);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear the data cache
   */
  clearCache() {
    this.dataCache.clear();
  }

  /**
   * Remove a file from cache
   */
  invalidateCache(filePath: string) {
    this.dataCache.delete(filePath);
  }
}
