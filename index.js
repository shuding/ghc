#!/usr/bin/env node

const program = require('commander')
const chalk = require('chalk')

const api = require('./api')
const file = require('./file')

const parseRepo = val => {
  const [user, repo] = val.split('/')
  return {user, repo}
}

program
  .version('0.0.1')
  .option('-i, --init [repo]', 'into a repo', parseRepo)
  .option('-b, --branch [branch]', 'choose branch', 'master')
  .parse(process.argv)

if (program.init) {
  const { user, repo } = program.init
  const branch = program.branch

  console.log(`Initializing ${user}/${repo}#${branch}...`)
  api.tree({ user, repo, branch }).then(tree => {
    console.log('OK')
    console.log('Initializing local cache...')
    return file.init({ user, repo, branch, tree })
  }).then(res => {
    console.log('OK')
    start()
  })
} else {
  console.log('Please use -i')
  process.exit()
}

// CLI interface
function start() {
  const NEWLINE = '\n'
  const TAB = '\t'
  const BACKSPACE = String.fromCharCode(127)
  const UP = '\u001B\u005B\u0041'
  const DOWN = '\u001B\u005B\u0042'

  let data
  let history = []
  let historyTop = -1

  process.stdin.pause()
  process.stdin.setRawMode(true)

  const highlight = str =>
    str.replace(/^(cat|ls|cd|exit)(?=($| |\t))/, chalk.green('$1'))

  const autocomplete = str =>
    file.autocomplete(str.split(' ').slice(-1)[0])

  const waitForInput = () => {
    process.stdout.write(NEWLINE)
    process.stdout.write(chalk.magenta(file.curr()) + NEWLINE)
    process.stdout.write(chalk.red.bold('> '))
    process.stdin.resume()
    data = []
  }

  const waitForErr = (err) => {
    // Just for fun
    console.log(chalk.red(err.message))
    waitForInput()
  }

  process.stdin.on('data', function (chunk) {
    let ch = chunk.toString()

    if (ch == BACKSPACE) {
      data.pop()
      process.stdout.clearLine()
      process.stdout.cursorTo(0)
      process.stdout.write(chalk.red.bold('> '))
      process.stdout.write(highlight(Buffer.concat(data).toString()))
      return
    } else if (ch == TAB) {
      let str = Buffer.concat(data).toString()
      let complete = Buffer(autocomplete(str))
      if (complete) {
        data.push(complete)
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(chalk.red.bold('> '))
        process.stdout.write(highlight(Buffer.concat(data).toString()))
      }
      return
    } else if (ch == UP) {
      if (historyTop >= 0) {
        data = history[historyTop--]
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        let cmd = Buffer.concat(data).toString()
        let str = chalk.red.bold('> ') + highlight(cmd)
        process.stdout.write(str)
        process.stdout.cursorTo(1 + cmd.length)
      }
      return
    } else if (ch == DOWN) {
      if (historyTop < history.length - 1) {
        data = history[++historyTop]
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        let cmd = Buffer.concat(data).toString()
        let str = chalk.red.bold('> ') + highlight(cmd)
        process.stdout.write(str)
        process.stdout.cursorTo(1 + cmd.length)
      }
      return
    } else {
      data.push(chunk)
      process.stdout.clearLine()
      process.stdout.cursorTo(0)
      process.stdout.write(chalk.red.bold('> '))
      process.stdout.write(highlight(Buffer.concat(data).toString()))
      if (ch !== '\u0004' && ch !== '\n' && ch !== '\r') {
        return
      }
    }

    process.stdin.pause()
    process.stdout.write(NEWLINE)
    let text = Buffer.concat(data).toString().trim()
    history.push([...data])
    history = history.splice(-50)
    historyTop = history.length - 1

    try {
      switch (true) {
        case text === 'exit':
          process.exit()
        case /^ls/.test(text):
          file.ls(text)
          waitForInput()
          break
        case /^cd /.test(text):
          file.cd(text)
          waitForInput()
          break
        case /^cat /.test(text):
          file.cat(text).then(waitForInput).catch(waitForErr)
          break
        // Custom usage
        case /^subl /.test(text):
          file.cat(text, false).then(({content, catPath}) => {
            // Data cached
            file.exec(`subl ${catPath}`)
            waitForInput()
          }).catch(waitForErr)
          break
        case /^atom /.test(text):
          file.cat(text, false).then(({content, catPath}) => {
            // Data cached
            file.exec(`atom ${catPath}`)
            waitForInput()
          }).catch(waitForErr)
          break
        default:
          file.exec(text)
          waitForInput()
      }
    } catch (err) {
      waitForErr(err)
    }
  })

  waitForInput()
}
