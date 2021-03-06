var crypto = require('crypto')
var pull = require('pull-stream')
var R = new Buffer(crypto.randomBytes(16).toString('hex'), 'ascii')
var pair = require('pull-pair')
var assert = require('assert')
var tape = require('tape')

var handshake = require('../')

function agreement (cb) {
  var stream = handshake(cb)
  var shake = stream.handshake
  shake.write(R)
  shake.read(32, function (err, data) {
    if(!err)
      assert.deepEqual(data, R)
    cb(null, shake.rest())
  })

  return stream
}

tape('simple', function (t) {

  var hello = new Buffer('hello there did it work?', 'ascii')

  var client = agreement(function (err, stream) {
    pull(
      pull.values([hello, hello, hello]),
      stream,
      pull.collect(function (err, data) {
        t.deepEqual(
          Buffer.concat(data),
          Buffer.concat([hello, hello, hello])
        )
        console.log('done')
        t.end()
      })
    )
  })

  var server = agreement(function (err, stream) {
    pull(stream, stream) //ECHO
  })

  function logger (name) {
    return pull.through(function (data) {
      console.log(name, data.toString('utf8'))
    })
  }

  pull(client, logger('A->B'), server, logger('A<-B'), client)

})


function abort (cb) {
  var stream = handshake(cb)
  var shake = stream.handshake
  shake.read(16, function (err, data) {
    shake.abort(new Error('intentional'))
  })

  return stream
}


tape('abort', function (t) {

  var client = agreement(function (err, stream) {

  })

  var server = abort(function (err) {
    t.ok(err)
    t.end()
  })

  pull(client, server, client)

})
