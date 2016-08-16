const https = require('https')
const atob = require('atob')

/**
 * Get a list of all, recursive file info in that repository.
 */
const tree = ({user, repo, branch}) => {
  const host = 'api.github.com'
  const path = `/repos/${user}/${repo}/git/trees/${branch}?recursive=1`
  const method = 'GET'

  const options = {
    host,
    path,
    method,
    headers: {
      'user-agent': 'node-ghc'
    }
  }

  return new Promise((resolve, reject) => {
    const body = []
    https.get(options, res => {
      res
        .on('data', d => body.push(d))
        .on('end', () => {
          resolve(JSON.parse(Buffer.concat(body).toString()))
        })
    })
  })
}

/**
 * Grab the file from GitHub, decode content w/ base64.
 */
const content = url => {
  const host = 'api.github.com'
  const path = url.split('api.github.com')[1]
  const method = 'GET'

  const options = {
    host,
    path,
    method,
    headers: {
      'user-agent': 'node-ghc'
    }
  }

  let clearLine = () => {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
  }

  let showPercentage = (curr, tot) => {
    clearLine()
    process.stdout.write((curr / tot * 100.0).toFixed(2) + '%')
  }

  return new Promise((resolve, reject) => {
    const body = []
    let total, current
    https.get(options, res => {
      total = res.headers['content-length']
      current = 0

      res
        .on('data', d => {
          body.push(d)
          current += d.length
          showPercentage(current, total)
        })
        .on('end', () => {
          clearLine()
          resolve(atob(JSON.parse(Buffer.concat(body).toString()).content))
        })
    })
  })
}

module.exports = { tree, content }
