// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const insertText = (val: string) => {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage(
      "Can't insert log because no document is open"
    );
    return;
  }

  const selection = editor.selection;

  const lineOfSelectedVar = selection.active.line;

  // editBuilder中的insert、delete和replace方法
  editor.edit((editBuilder) => {
    // 行号+1
    // vscode.Position  位置 与 vscode.Range 区域
    editBuilder.insert(new vscode.Position(lineOfSelectedVar + 1, 0), val);
  });
};

function getAllLogStatements() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  // 获取编辑器页面文本
  const document = editor.document;
  const documentText = document.getText();

  let logStatements = [];
  // 检测console的正则表达式
  const logRegex =
    /console.(log|debug|info|warn|error|assert|dir|dirxml|trace|group|table|groupEnd|time|timeEnd|profile|profileEnd|count)\((.*)\);?/g;
  let match;
  // 正则循环匹配页面文本
  while ((match = logRegex.exec(documentText))) {
    // 每次匹配到当前的范围--Range
    let matchRange = new vscode.Range(
      document.positionAt(match.index),
      document.positionAt(match.index + match[0].length)
    );
    if (!matchRange.isEmpty) {
      // 把Range放入数组
      logStatements.push(matchRange);
    }
  }
  return logStatements;
}

export function activate(context: vscode.ExtensionContext) {
  // 插入log
  const insertConsole = vscode.commands.registerCommand('insertConsole', () => {
    // 拿到当前编辑页面的内容对象 editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    // 拿到光标选中的文本并格式化
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    let text1 = text;
    // 在这里拼写console语句
    let logToInsert;
    if (/^('|").*('|")$/gi.test(text1)) {
      text1 = text1.replace(/('|")/gi, '');
    }
    // 错误信息
    if (/^(e|err|error)$/gi.test(text1)) {
      logToInsert = `console.log('%c${text1}: ${text1}', 'color: red;');\n`;
    }
    // 数组
    else if (/^\[.*\]$/g.test(text1)) {
      logToInsert = `console.table(${text1});\n`;
    } else {
      logToInsert = `console.log('${text1}: ',${text1});\n`;
    }
    // 执行插行方法
    text1 ? insertText(logToInsert) : insertText('console.log();');
    vscode.commands.executeCommand('editor.action.formatDocument');
  });
  // 最后，我们把注册的命令事件放入上下文的订阅中
  context.subscriptions.push(insertConsole);

  // 删除log
  const deleteAllLog = vscode.commands.registerCommand('clearConsole', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    // vscode.WorkspaceEdit 工作区编辑方法，可操作多个文件，也可新增或删除 文本、文件、文件夹
    let workspaceEdit = new vscode.WorkspaceEdit();
    const document = editor.document;

    const logStatements = getAllLogStatements();
    if (!logStatements) {
      return;
    }
    // 循环遍历每个匹配项的range，并删除
    logStatements.forEach((log) => {
      workspaceEdit.delete(document.uri, log);
    });

    // 完成后显示消息提醒
    vscode.workspace.applyEdit(workspaceEdit).then(() => {
      editor.edit((editBuilder) => {
        let text = editor.document.getText();
        // 正则匹配替换掉注释文本
        text = text.replace(/^\s*\n/gm, '');
        // text = text.replace(/^\s*\n\s*\n/gm, '');
        // 全量替换当前页面文本
        const end = new vscode.Position(editor.document.lineCount + 1, 0);
        editBuilder.replace(
          new vscode.Range(new vscode.Position(0, 0), end),
          text
        );
        // 执行格式化代码操作
        vscode.commands.executeCommand('editor.action.formatDocument');
      });
      vscode.window.showInformationMessage(
        `${logStatements.length} console deleted`
      );
    });
  });

  context.subscriptions.push(deleteAllLog);

  // 删除注释
  let removeComments = vscode.commands.registerCommand(
    'clearComment',
    function () {
      // const URLRegExp = /(((https?):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)*))((\.[a-zA-Z—]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&\/~+#-]))|((kim:\/\/)[\w.,@?^=%&:/~+#-]+)/g;
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      editor.edit((editBuilder) => {
        let text = editor.document.getText();
        // 正则匹配替换掉注释文本
        text = text
          .replace(
            /((\/\*([\w\W]+?)\*\/)|([^:]?\/\/(.(?!"\)))+)|(^\s*(?=\r?$)\n))/gm,
            ''
          )
          .replace(/(^\s*(?=\r?$)\n)/gm, '')
          .replace(/\\n\\n\?/gm, '');
        // 全量替换当前页面文本
        const end = new vscode.Position(editor.document.lineCount + 1, 0);
        editBuilder.replace(
          new vscode.Range(new vscode.Position(0, 0), end),
          text
        );
        // 执行格式化代码操作
        vscode.commands.executeCommand('editor.action.formatDocument');
      });
    }
  );

  context.subscriptions.push(removeComments);
}

// this method is called when your extension is deactivated
export function deactivate() {}
