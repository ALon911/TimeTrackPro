import { Express, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

export function setupDownloadRoutes(app: Express) {
  // Serve the static ZIP file directly
  app.get('/download-file', (req: Request, res: Response) => {
    const projectRoot = process.cwd();
    // Find any ZIP file in the root directory
    const files = fs.readdirSync(projectRoot);
    let zipFilePath = '';
    
    for (const file of files) {
      if (file.startsWith('timetracker-app') && file.endsWith('.zip')) {
        zipFilePath = path.join(projectRoot, file);
        break;
      }
    }
    
    if (!zipFilePath) {
      return res.status(404).send('No download file found');
    }
    
    // Serve it statically
    res.sendFile(zipFilePath);
  });
  
  app.get('/download', async (req: Request, res: Response, next: NextFunction) => {
    let zipFilePath = '';
    
    try {
      // Create a unique filename to avoid conflicts
      const timestamp = Date.now();
      const projectRoot = process.cwd();
      zipFilePath = path.join(projectRoot, `timetracker-app-${timestamp}.zip`);
      
      // Check if any previous zip files exist, remove them to avoid any issues
      const files = fs.readdirSync(projectRoot);
      for (const file of files) {
        if (file.startsWith('timetracker-app') && file.endsWith('.zip')) {
          try {
            fs.unlinkSync(path.join(projectRoot, file));
            console.log(`Removed existing zip file: ${file}`);
          } catch (err) {
            console.error(`Failed to remove existing zip file: ${file}`, err);
          }
        }
      }
      
      console.log(`Creating new zip file: ${zipFilePath}`);
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      } as archiver.ArchiverOptions);

      // Create a promise that resolves when the archive is finalized
      const archivePromise = new Promise<void>((resolve, reject) => {
        output.on('close', () => {
          console.log('Archive created successfully - ' + archive.pointer() + ' total bytes');
          resolve();
        });
        
        archive.on('error', (err) => {
          console.error('Archive error:', err);
          reject(err);
        });
      });

      // Pipe archive data to the output file
      archive.pipe(output);

      // Add main directories to the archive
      const foldersToInclude = ['client', 'server', 'shared', 'react-native-app'];
      
      for (const folder of foldersToInclude) {
        const folderPath = path.join(projectRoot, folder);
        if (fs.existsSync(folderPath)) {
          archive.directory(folderPath, folder);
        }
      }

      // Add root level files (exclude large/unnecessary files)
      const filesToExclude = [
        'node_modules', 
        '.git', 
        'package-lock.json', 
        '.env', 
        'timetracker-app.zip'
      ];
      
      const rootFiles = fs.readdirSync(projectRoot);
      
      for (const file of rootFiles) {
        const filePath = path.join(projectRoot, file);
        const isDirectory = fs.statSync(filePath).isDirectory();
        
        if (!isDirectory && !filesToExclude.includes(file)) {
          archive.file(filePath, { name: file });
        }
      }

      // Finalize the archive and wait for it to complete
      archive.finalize();
      await archivePromise;
      
      // Verify the file exists and has content
      if (!fs.existsSync(zipFilePath)) {
        throw new Error('Generated zip file not found');
      }
      
      const stats = fs.statSync(zipFilePath);
      if (stats.size === 0) {
        throw new Error('Generated zip file is empty');
      }
      
      console.log(`Zip file created successfully at ${zipFilePath} (${stats.size} bytes)`);
      
      // Headers are set automatically by res.download
      
      // Use res.download which handles streaming automatically
      res.download(zipFilePath, `timetracker-app-${timestamp}.zip`, (err) => {
        if (err) {
          console.error('Error during download:', err);
          if (!res.headersSent) {
            res.status(500).send('Error downloading the file');
          }
        } else {
          console.log('Download complete, file sent to client');
        }
      });

    } catch (error) {
      console.error('Error creating or sending zip file:', error);
      if (!res.headersSent) {
        res.status(500).send('Error creating or sending the download package');
      }
    }
  });
  
  // Add an endpoint to check if the download is ready
  app.get('/download-info', (_req: Request, res: Response) => {
    res.json({
      downloadReady: true,
      downloadUrl: '/download',
      appName: 'TimeTracker',
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  });
  
  // General error handler for download routes
  app.use('/download', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Download error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error processing your download request. Please try again.');
    }
  });
}