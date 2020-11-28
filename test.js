'use strict'

const test = require('tape')
const execFileSync = require('child_process').execFileSync
const tmp = require('os').tmpdir()
const validRef = require('.')

// Optionally compare results against git
const compare = process.argv.slice(2).includes('--compare')

test('valid refname', function (t) {
  const names = [
    'foo',
    'FOO',
    'foo/a.lockx',
    'foo.123',
    'foo/123',
    'foo/bar/123',
    'foo.bar.123',
    'foo-bar_baz',
    'head',
    'HEAD',
    '-foo',
    'foo-',
    'foo@bar',
    '\ud83d\udca9',
    'ünicöde',
    '\x80'
  ]

  for (const name of names) {
    check(t, name, true, true)
  }

  for (const char of '!"#$%&\'{}`()]|;,') {
    check(t, char, true, true)
  }

  t.end()
})

test('onelevel', function (t) {
  check(t, 'foo', true, true)
  check(t, 'foo', true, 'truthy')
  check(t, 'foo', false, false)
  check(t, 'foo/bar', true, false)
  check(t, 'refs/heads/foo', true, false)
  t.end()
})

test('invalid refname', function (t) {
  const names = [
    '',
    '.',
    '..',
    '/',
    '//',
    '/./',
    './.',
    '.foo',
    'foo/.123',
    'foo.',
    'a.lock',
    'foo/a.lock',
    'foo/a.lock/b',
    'foo.123.',
    'foo/.123/bar',
    'foo//123',
    '/foo',
    'foo/',
    'foo..bar',
    'foo@{bar',
    '\x7f'
  ]

  if (!compare) {
    names.push('@')
  }

  for (const name of names) {
    check(t, name, false, true)
  }

  for (const char of ' ~^:?*[\n\x01\\') {
    check(t, 'a' + char + 'x', false, true)
  }

  t.end()
})

test('name must be a string', function (t) {
  t.throws(() => validRef(1), /^TypeError: Reference name must be a string/)
  t.end()
})

function check (t, name, expected, onelevel) {
  t.is(validRef(name, onelevel), expected, printable(name))

  if (compare && name !== '' && !name.startsWith('-')) {
    t.is(checkGit(name, onelevel), expected, 'git: ' + printable(name))
  }
}

function printable (str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x1f\x7f-\uffff]/g, function (s) {
    return `\\u${s.charCodeAt(0).toString(16).padStart(4, '0')}`
  })
}

function checkGit (name, onelevel) {
  const flag = onelevel ? '--allow-onelevel' : '--no-allow-onelevel'
  const args = ['check-ref-format', flag, name]
  const opts = { stdio: 'ignore', cwd: tmp }

  try {
    execFileSync('git', args, opts)
    return true
  } catch {
    return false
  }
}
