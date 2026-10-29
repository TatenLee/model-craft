/* Python executes in a disposable worker: long-running submissions never block the UI. */
let runtime;
self.onmessage = async ({ data }) => {
  try {
    if (!runtime) {
      self.postMessage({ type: 'status', message: '首次加载 Python 运行时，需要联网。你可以随时停止。' });
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.29.2/full/pyodide.js');
      runtime = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.2/full/' });
    }
    self.postMessage({ type: 'ready' });
    runtime.globals.set('submission_code', data.code);
    runtime.globals.set('test_json', JSON.stringify(data.tests));
    const result = await runtime.runPythonAsync(`
import json, io, traceback, contextlib
_output = io.StringIO()
_scope = {'__name__': '__main__'}
_result = {'stdout': '', 'tests': [], 'error': None}
with contextlib.redirect_stdout(_output), contextlib.redirect_stderr(_output):
    try:
        exec(submission_code, _scope)
    except BaseException:
        _result['error'] = traceback.format_exc(limit=4)
    if _result['error'] is None:
        for _test in json.loads(test_json):
            try:
                exec(_test['code'], _scope)
                _result['tests'].append({'name': _test['name'], 'passed': True})
            except BaseException:
                _result['tests'].append({'name': _test['name'], 'passed': False, 'error': traceback.format_exc(limit=3)})
_result['stdout'] = _output.getvalue()[:24000]
json.dumps(_result, ensure_ascii=False)
`);
    self.postMessage({ type: 'result', result: JSON.parse(result) });
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error) });
  }
};
