import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { ChildProcess } from 'child_process';
import { Plugin, Compiler, Stats } from 'webpack';

export interface Options {
  outputPath?: string;
  outputFilename?: string;
  context?: string;
  onChange?: (filepath: string) => void;
  onStart?: (filepath: string) => void;
  onStop?: () => void;
  onError?: (exitCode: number) => void;
}

interface OptionsWithDefaults extends Options {
  outputFilename: string;
  onChange: (filepath: string) => void;
  onStart: (filepath: string) => void;
  onStop: () => void;
  onError: (exitCode: number) => void;
}

const defaultOptions: OptionsWithDefaults = {
  outputFilename: 'index.js',
  onChange: filepath => {
    console.log(`# Changed ${filepath}, recompiling server...`);
  },
  onStart: filepath => {
    console.log(`# Run server ${filepath}`);
  },
  onStop: () => {
    console.log(`# Stopping server...`);
  },
  onError: exitCode => {
    console.log(`# Server exited with error, waiting for changes to restart...`);
  }
};

export default class NodeRunWebpackPlugin implements Plugin {
  private isWebpackWatching: boolean;
  private process: ChildProcess | null;
  private options: OptionsWithDefaults;

  constructor(options: Options = {}) {
    this.options = Object.assign({}, defaultOptions, options);
    this.isWebpackWatching = false;
    this.process = null;

    process.on('exit', () => {
      this.stopProcess();
    });
  }

  apply(compiler: Compiler) {
    this.updateOptions(compiler);

    compiler.plugin('watch-run', (_, callback: () => any) => {
      this.isWebpackWatching = true;
      callback();
    });

    compiler.plugin('watch-close', () => {
      this.isWebpackWatching = false;
    });

    compiler.plugin('invalid', (fileName: string) => {
      if (this.isWebpackWatching) {
        this.options.onChange(this.realtiveToContext(fileName));
        this.stopProcess();
      }
    });

    compiler.plugin('done', (stats: Stats) => {
      if (this.isWebpackWatching) {
        if (!stats.hasErrors()) {
          this.startProcess();
        }
      }
    });
  }

  private updateOptions(compiler: Compiler) {
    if (!this.options.outputPath) {
      if (!compiler.options.output || !compiler.options.output.path) {
        throw new Error('Undefined "output.path" webpack option.');
      }
      this.options.outputPath = compiler.options.output && compiler.options.output.path;
    }

    if (!this.options.context) {
      if (!compiler.options.context) {
        throw new Error('Undefined "context" webpack option.');
      }

      this.options.context = compiler.options.context;
    }
  }

  private realtiveToContext(filepath: string) {
    return this.options.context ? path.relative(this.options.context, filepath) : filepath;
  }

  private startProcess() {
    if (this.process) {
      return;
    }
    if (!this.options.outputPath || !this.options.outputFilename) {
      throw new Error('Undefined "outputPath" or "outputFilename" option.');
    }

    const nodeBin = process.argv[0];
    const outputPath = path.join(this.options.outputPath, this.options.outputFilename);

    this.options.onStart(this.realtiveToContext(outputPath));

    this.process = child_process.spawn(nodeBin, [outputPath], { stdio: 'inherit' });
    this.process.on('exit', code => {
      this.process = null;
      if (code) {
        this.options.onError(code);
      }
    });
  }

  private stopProcess() {
    if (this.process) {
      try {
        this.options.onStop();
      } finally {
        this.process.kill();
      }
    }
  }
}
