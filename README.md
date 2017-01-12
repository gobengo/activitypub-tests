# activitypub-tests

A WIP test suite for [ActivityPub](https://www.w3.org/TR/activitypub/) Servers.

Status: Just started, has 4 of the easiest tests to write. Testing server to server requirements is nontrivial but doable, but it will probably need to involve actually deploying little 'assertion ActivityPub servers' to the public web, so that the ActivityPub server being tested can actually communicate with them.

Goals

* Test all the things described in [this document](https://github.com/gobengo/activitypub/blob/implementation-reports/implementation-reports/TEMPLATE-WIP.md)
* Build a good CLI so the tests can be automated
* But also build toward these tests being exposed on the web for ease of use and evanglizability, a la https://webmention.rocks/
* Tests should have individual IDs so they can be linked to
* Test failures should have useful explanations about what went wrong

## Usage

`npm install`

NOTE: requires async/await support (e.g. using >= node v7.0.0)

e.g. with passing tests

```
$ ./cli.js http://distbin.com
[
  {
    "ok": true,
    "test": {
      "type": "Test",
      "id": "D8953217-B813-4C90-8214-A5A1968B68F5",
      "name": "outbox is discoverable"
    },
    "value": "http://distbin.com/activitypub/outbox"
  },
  {
    "ok": true,
    "test": {
      "type": "Test",
      "id": "F7E85B25-172C-463E-AE4D-1FACECB92DE9",
      "name": "Outbox accepts Activity Objects"
    }
  },
  {
    "ok": true,
    "test": {
      "type": "Test",
      "id": "DAAAA217-B813-4C90-8214-A5A1968B68F5",
      "name": "inbox is discoverable"
    },
    "value": "http://distbin.com/activitypub/inbox"
  },
  {
    "ok": true,
    "test": {
      "type": "Test",
      "id": "asdfasdfasdeee",
      "name": "Inbox accepts Activity Notifications"
    }
  }
]

```

e.g. with failing tests

```
$ ./cli.js http://dustycloud.org
[
  {
    "ok": false,
    "test": {
      "type": "Test",
      "id": "D8953217-B813-4C90-8214-A5A1968B68F5",
      "name": "outbox is discoverable"
    },
    "errors": [
      {
        "message": "Failed to parse http://dustycloud.org as JSON"
      }
    ]
  },
  {
    "ok": false,
    "test": {
      "type": "Test",
      "id": "F7E85B25-172C-463E-AE4D-1FACECB92DE9",
      "name": "Outbox accepts Activity Objects"
    },
    "errors": [
      {
        "message": "Failed to parse http://dustycloud.org as JSON"
      }
    ]
  },
  {
    "ok": false,
    "test": {
      "type": "Test",
      "id": "DAAAA217-B813-4C90-8214-A5A1968B68F5",
      "name": "inbox is discoverable"
    },
    "errors": [
      {
        "message": "Failed to parse http://dustycloud.org as JSON"
      }
    ]
  },
  {
    "ok": false,
    "test": {
      "type": "Test",
      "id": "asdfasdfasdeee",
      "name": "Inbox accepts Activity Notifications"
    },
    "errors": [
      {
        "message": "Failed to parse http://dustycloud.org as JSON"
      }
    ]
  }
]
```