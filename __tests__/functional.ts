import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const webpackBin = path.resolve(__dirname, '../node_modules/.bin/webpack');
const webpackConfig = path.resolve(__dirname, '../example/webpack.config.js');
const mainJs = path.resolve(__dirname, '../example/main.js');

describe('files', () => {
  test('webpack executable', done => {
    expect.assertions(1);
    fs.access(webpackBin, fs.constants.X_OK, err => {
      expect(err).toBe(null);
      done();
    });
  });
  test('webpack config readable', done => {
    expect.assertions(1);
    fs.access(webpackConfig, fs.constants.R_OK, err => {
      expect(err).toBe(null);
      done();
    });
  });
  test('main.js writable', done => {
    expect.assertions(1);
    fs.access(mainJs, fs.constants.W_OK, err => {
      expect(err).toBe(null);
      done();
    });
  });
});
describe('watch mode', () => {
  test(
    'basic',
    done => {
      expect.assertions(4);
      const process = child_process.execFile(
        webpackBin,
        ['--watch', '--config', webpackConfig],
        (error, stdout, stderr) => {
          expect(error).toBeTruthy();
          expect(stderr).toMatchSnapshot();
          expect(stdout).toMatchSnapshot();
          done();
        }
      );
      setTimeout(() => {
        process.kill();
        expect(process.killed).toBe(true);
      }, 3000);
    },
    10000
  );
  test(
    'with touch',
    done => {
      expect.assertions(4);
      const process = child_process.execFile(
        webpackBin,
        ['--watch', '--config', webpackConfig],
        (error, stdout, stderr) => {
          expect(error).toBeTruthy();
          expect(stderr).toMatchSnapshot();
          expect(stdout).toMatchSnapshot();
          done();
        }
      );
      setTimeout(() => {
        fs.utimesSync(mainJs, new Date(), new Date());

        setTimeout(() => {
          process.kill();
          expect(process.killed).toBe(true);
        }, 4000);
      }, 1000);
    },
    10000
  );
});
