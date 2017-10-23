import { Options } from './../src/NodeRunWebpackPlugin';
import NodeRunWebpackPlugin from '../src/NodeRunWebpackPlugin';
import { Compiler, Stats } from 'webpack';

const CompilerMock = jest.fn<Compiler>((options, plugin) => ({ options, plugin }));

describe('constructor', () => {
  test('work without params', () => {
    const instance = new NodeRunWebpackPlugin();
    expect(instance).toBeInstanceOf(NodeRunWebpackPlugin);
    expect(instance).toMatchSnapshot();
  });
  test('work with params', () => {
    const instance = new NodeRunWebpackPlugin({ outputFilename: 'server.js' });
    expect(instance).toBeInstanceOf(NodeRunWebpackPlugin);
    expect(instance).toMatchSnapshot();
  });
  test('error about path', () => {
    const compiler = new CompilerMock({ output: {}, context: 'context' }, jest.fn());
    const instance = new NodeRunWebpackPlugin();
    expect(() => instance.apply(compiler)).toThrow('Undefined "output.path" webpack option.');
  });
  test('get path from options', () => {
    const compiler = new CompilerMock({ output: {}, context: 'context' }, jest.fn());
    const instance = new NodeRunWebpackPlugin({ outputPath: 'path' });
    expect(() => instance.apply(compiler)).not.toThrowError();
    expect(instance).toMatchSnapshot();
  });
  test('error about context', () => {
    const compiler = new CompilerMock({ output: { path: 'path' } }, jest.fn());
    const instance = new NodeRunWebpackPlugin();
    expect(() => instance.apply(compiler)).toThrow('Undefined "context" webpack option.');
  });
  test('get context from options', () => {
    const compiler = new CompilerMock({ output: { path: 'path' } }, jest.fn());
    const instance = new NodeRunWebpackPlugin({ context: 'context' });
    expect(() => instance.apply(compiler)).not.toThrowError();
    expect(instance).toMatchSnapshot();
  });
});
describe('apply', () => {
  const options: Options = {
    onStart: jest.fn(),
    onChange: jest.fn(),
    onError: jest.fn(),
    onStop: jest.fn()
  };
  const instance = new NodeRunWebpackPlugin(options);
  const eventMap: { [eventName: string]: Function } = {};
  const PluginMock = jest.fn<Function>((eventName: string, callback: Function) => {
    eventMap[eventName] = callback;
  });
  test('return void', () => {
    const compiler = new CompilerMock({ output: { path: 'path' }, context: 'context' }, PluginMock);
    expect(instance.apply(compiler)).toBe(undefined);
    expect(instance).toMatchSnapshot();
  });
  test('plugin events are set', () => {
    expect(PluginMock).toHaveBeenCalledTimes(4);
    expect(PluginMock).toHaveBeenCalledWith('watch-run', expect.any(Function));
    expect(PluginMock).toHaveBeenCalledWith('watch-close', expect.any(Function));
    expect(PluginMock).toHaveBeenCalledWith('invalid', expect.any(Function));
    expect(PluginMock).toHaveBeenCalledWith('done', expect.any(Function));
  });
  test('mock event map is populated', () => {
    expect(eventMap).toMatchObject({
      'watch-run': expect.any(Function),
      'watch-close': expect.any(Function),
      invalid: expect.any(Function),
      done: expect.any(Function)
    });
  });
  test('event done does nothing before watching', () => {
    const hasErrors = jest.fn();
    const StatsMock = jest.fn<Stats>(() => ({ hasErrors }));
    eventMap['done'](new StatsMock());
    expect(hasErrors).not.toHaveBeenCalled();
    expect(options.onStart).not.toHaveBeenCalled();
  });
  test('event invalid does nothing before watching', () => {
    eventMap['invalid']('file');
    expect(options.onChange).not.toHaveBeenCalled();
  });
  test('event watch-run is async', () => {
    const CallbackMock = jest.fn();
    eventMap['watch-run'](null, CallbackMock);
    expect(CallbackMock).toHaveBeenCalled();
  });
  test('event done does not start with errors', () => {
    const hasErrors = jest.fn(() => true);
    const StatsMock = jest.fn<Stats>(() => ({ hasErrors }));
    eventMap['done'](new StatsMock());
    expect(hasErrors).toHaveBeenCalledTimes(1);
    expect(options.onStart).not.toHaveBeenCalled();
  });
  test('event done starts without errors', () => {
    const hasErrors = jest.fn(() => false);
    const StatsMock = jest.fn<Stats>(() => ({ hasErrors }));
    eventMap['done'](new StatsMock());
    expect(hasErrors).toHaveBeenCalledTimes(1);
    expect(options.onStart).toHaveBeenCalledTimes(1);
    expect(options.onStart).toHaveBeenCalledWith('../path/index.js');
  });
  test('event invalid gives filename', () => {
    eventMap['invalid']('file');
    expect(options.onChange).toHaveBeenCalledTimes(1);
    expect(options.onChange).toHaveBeenCalledWith('../file');
  });
  test('event watch-close works', () => {
    expect(() => eventMap['watch-close']()).not.toThrowError();
  });
  test('lock event states', () => {
    expect(options.onStart).toHaveBeenCalledTimes(1);
    expect(options.onStop).toHaveBeenCalledTimes(1);
    expect(options.onChange).toHaveBeenCalledTimes(1);
    expect(options.onError).toHaveBeenCalledTimes(0);
  });
});
