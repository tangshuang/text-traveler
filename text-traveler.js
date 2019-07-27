class TextTraveler {
  constructor(entries) {
    this._entries = entries
    this._status = -1
    this._resources = []
    this._events = []
  }

  on(event, callback) {
    this._events.push({ event, callback })
    return this
  }

  off(event, callback) {
    const events = this._events.filter(item => item.event === event)
    events.forEach((item, i) => {
      if (callback === undefined || item.callback === callback) {
        this._events.splice(i, 1)
      }
    })
    return this
  }

  emit(event, ...args) {
    const items = this._events.filter(item => item.event === event)
    items.forEach((item) => {
      item.callback.call(this, ...args)
    })
    return this
  }

  async iterate() {
    if (this._status < 1) {
      return
    }

    if (!this._resources.length) {
      this.stop()
      return
    }

    const sleep = (delay) => new Promise((resolve) => {
      setTimeout(resolve, delay)
    })

    const item = this._resources.shift()
    const { text, speed, wait, rollback, interlude } = item

    this.emit('enter', item)

    const words = text.split('')
    for (let word of words) {
      this.emit('type', word)
      await sleep(speed)
    }

    this.emit('wait')
    await sleep(wait)

    if (rollback) {
      this.emit('rollback')

      words.reverse()
      for (let word of words) {
        this.emit('delete', word)
        await sleep(speed)
      }

      this.emit('interlude')
      await sleep(interlude)
    }

    await this.iterate()
  }

  start() {
    if (this._status > 0) {
      return this
    }

    if (this._status === -1) {
      this._resources = [...this._entries]
    }

    this._status = 1
    this.iterate()

    this.emit('start')
    return this
  }
  pause() {
    this._status = 0
    this.emit('pause')
    return this
  }
  stop() {
    this._status = -1
    this.emit('stop')
    return this
  }
}

function travelText(strs, ...args) {
  const items = []
  strs.forEach((str, i) => {
    const arg = args[i]
    const params = Array.isArray(arg) ? arg : [arg]
    const [speed = 0, wait = 0, rollback = 0, interlude = 0] = params

    let text = ''
    if (i === 0) {
      text = str.trimStart()
      if (!text) {
        return
      }
    }
    else if (i === strs.length - 1) {
      text = str.trimEnd()
      if (!text) {
        return
      }
    }
    else {
      text = str.replace(/^\n +/, '\n')
    }

    items.push({
      text,
      speed,
      wait,
      rollback,
      interlude,
    })
  })
  const traveler = new TextTraveler(items)
  return traveler
}

function createWriter(container, loop) {
  return function(strs, ...args) {
    const traveler = travelText(strs, ...args)
    traveler.on('type', (text) => {
      container.innerText += text
    })

    traveler.on('delete', () => {
      const text = container.innerText
      const next = text.slice(0, text.length - 1)
      container.innerText = next
    })

    traveler.start()

    if (loop) {
      traveler.on('stop', () => {
        container.innerText = ''
        traveler.start()
      })
    }

    return traveler
  }
}
