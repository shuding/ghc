const fs = require('fs')
const path = require('path')

const shell = require('shelljs')
const chalk = require('chalk')
const hljs = require('highlight-term.js')

const api = require('./api')

const TYPE = Symbol('type')
const NAME = Symbol('name')
const URL = Symbol('url')

let prefix

let root
let current
let repoTree

// Change current working directory
const chdir = dir => {
  process.chdir(dir)
  current = dir
}

// Relative dir => absolute dir
const redir = dir => path.resolve(current, dir)

// Right pad without another npm package..
const rightPad = (str, l) => str + ' '.repeat(l - str.length)

// Tree array => big object
const buildTree = files => {
  let tree = {[TYPE]: 'tree', [NAME]: ''}
  files.forEach(file => {
    let pointer = tree
    let route = file.path.split(path.sep)
    route.forEach(name =>
      pointer = pointer[name] ? pointer[name] : pointer[name] = {
        [NAME]: name
      }
    )
    pointer[TYPE] = file.type
    pointer[URL] = file.url
  })
  return tree
}

/**
 * Initialize the repo (recursive data from github api)
 */
const init = ({ user, repo, branch, tree }) => {
  prefix = `∆ ${user}/${repo} [${branch}] `
  repoTree = buildTree(tree.tree)
  return new Promise((resolve, reject) => {
    const dir = `${user}_${repo}_${branch}_ghc`
    fs.mkdir(dir, err => {
      root = path.join(process.cwd(), dir)
      chdir(root)
      resolve()
    })
  })
}

/**
 * List files
 */
const ls = cmd => {
  // Remove 'ls '
  cmd = cmd.slice(3).trim()

  let absPath
  let repoPath
  let recursive = false
  let tree = false

  if (cmd.startsWith('-')) {
    // Got options
    let options
    [options, ...cmd] = cmd.slice(1).split(' ')

    recursive = /R/.test(options)
    tree = /T/.test(options)

    cmd = cmd.join(' ').trim()
  }

  absPath = redir(cmd) || current
  repoPath = path.relative(root, absPath)

  // Dispaly
  let pointer = repoTree
  let maxLen = 0
  let cnt = 1

  repoPath
    .split(path.sep)
    .filter(p => p)
    .forEach(name => {
      if (pointer[name]) {
        pointer = pointer[name]
      } else {
        throw new Error(`Error: file ${name} not found.`)
      }
    })

  for (let file of Object.keys(pointer)) {
    maxLen = Math.max(maxLen, pointer[file][NAME].length + 3)
  }

  cnt = ~~((process.stdout.columns - 10) / maxLen)

  let buf = 0
  for (let file of Object.keys(pointer)) {
    let name = rightPad(pointer[file][NAME], maxLen)
    if (pointer[file][TYPE] === 'tree') {
      process.stdout.write(chalk.cyan(name))
    } else {
      process.stdout.write(name)
    }
    ++buf
    if (buf == cnt) {
      process.stdout.write('\n')
      buf = 0
    }
  }
  if (buf) {
    process.stdout.write('\n')
  }
}

/**
 * Navigate the repo tree
 */
const cd = cmd => {
  let cdPath = redir(cmd.slice(3).trim()) || current

  if (root.length > cdPath.length) {
    throw new Error('Error: cannot navigate out of the repo.')
  }

  let repoPath = path.relative(root, cdPath)
  let pointer = repoTree

  repoPath
    .split(path.sep)
    .filter(p => p)
    .forEach(name => {
      if (pointer[name]) {
        pointer = pointer[name]
      } else {
        throw new Error(`Error: file ${name} not found.`)
      }
    })

  if (pointer[TYPE] !== 'tree') {
    throw new Error(`Error: cannot cd into a non-directory.`)
  }

  if (!fs.existsSync(cdPath)) {
    fs.mkdirSync(cdPath)
  }
  chdir(cdPath)
}

const exec = cmd => {
  shell.exec(cmd)
}

/**
 * Grab the file content from 1) cache 2) github api
 * if 2) then save to cache
 */
const get = (filePath, url) =>
  new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      // Already cached
      fs.readFile(filePath, {
        encoding: 'utf8'
      }, (err, data) => {
        resolve(data)
      })
    } else {
      // Fetch content and cache it
      api.content(url).then(content => {
        fs.writeFileSync(filePath, content)
        resolve(content)
      })
    }
  })

/**
 * Dog
 */
const cat = (cmd, display = true) =>
  new Promise((resolve, reject) => {
    let catPath = redir(cmd.slice(4).trim())
    let repoPath = path.relative(root, catPath)

    if (!catPath) {
      return reject(new Error(`Error: no directory specified.`))
    }

    let pointer = repoTree

    repoPath
      .split(path.sep)
      .filter(p => p)
      .forEach(name => {
        if (pointer[name]) {
          pointer = pointer[name]
        } else {
          reject(new Error(`Error: file ${name} not found.`))
          // Fast abort inside a function
          throw 1
        }
      })

    if (pointer[TYPE] === 'tree') {
      return reject(new Error(`Error: cannot cat a directory.`))
    }

    get(catPath, pointer[URL]).then(content => {
      if (display) {
        // Highlight
        process.stdout.write(
          hljs
            .highlightAuto(content)
            .value
            .replace(/\t/g, '    ')
        )
      }
      resolve({content, catPath})
    })
  })

/**
 * 'he' => 'llo'
 */
const autocomplete = str => {
  let filename = str.split(path.sep).slice(-1)[0]
  let repoPath = path.relative(root, current)

  let pointer = repoTree

  repoPath
    .split(path.sep)
    .filter(p => p)
    .forEach(name => {
      if (pointer[name]) {
        pointer = pointer[name]
      } else {
        return ''
      }
    })

  for (let file of Object.keys(pointer)) {
    let name = pointer[file][NAME]
    if (name.startsWith(filename)) {
      return name.slice(filename.length)
    }
  }

  return ''
}

/**
 * Display an information line (current repo, current dir)
 */
const curr = () => prefix + path.relative(root, current)

module.exports = { init, curr, ls, cd, cat, autocomplete, exec }
