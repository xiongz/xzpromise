import { isFunction } from './utils'
import { Status } from "./enum";
class XZPromise {
  _status: Status
  _value: any
  _fulfilledQueues: any []
  _rejectedQueues: any []
  static resolve(value: any) {
    if (value instanceof XZPromise) return value
    return new XZPromise((resolve: (v: any)=>void) => resolve(value))
  }
  static reject(value: any) {
    return new XZPromise((resolve: (v: any) => void, reject: (v: any) => void) => reject(value))
  }
  static all(list: any) {
    return new XZPromise((resolve: (v: any) => void, reject: (v: any) => void) => {
      let values: any[] = []
      let count = 0
      for (let [i, p] of list.entries()) {
        this.resolve(p).then((res: any) => {
          values[i] = res
          count++
          if (count === list.length) resolve(values)
        }, (err: any) => {
          reject(err)
        })
      }
    })
  }
  static race(list: any) {
    return new XZPromise((resolve: (v: any) => void, reject: (v: any) => void) => {
      for (let p of list) {
        this.resolve(p).then((res: any) => {
          resolve(res)
        }, (err: any) => {
          reject(err)
        })
      }
    })
  }
  constructor(handle: (v1: any, v2?: any) => void) {
    if (!isFunction(handle)) {
      throw new Error('XZPromise must accept a function as a parmeter')
    }
    this._status = Status.PENDING
    this._value = undefined
    this._fulfilledQueues = []
    this._rejectedQueues = []
    // 执行handle方法
    try {
      handle.call(this, this._resolve.bind(this), this._reject.bind(this))
    } catch(err) {
      this._reject.call(this, err)
    }
  }
  private _resolve(val: any) {
    if (this._status !== Status.PENDING) return
    this._status = Status.FULFILLED
    this._value = val
    let fulfilled
    while (fulfilled = this._fulfilledQueues.shift()) {
      fulfilled(this._value)
    }
  }
  private _reject(val: any) {
    if (this._status !== Status.PENDING) return
    this._status = Status.REJECTED
    this._value = val
    let rejected
    while (rejected = this._rejectedQueues.shift()) {
      rejected(this._value)
    }
  }
  public then(onFulfilled: (v: any) => void, onRejected?: (v: any) => void) {
    const { _value, _status } = this
    return new XZPromise((onFulfilledNext: (v: any) => void, onRejectedNext: (v: any) => void) => {
      const fulfilled = (value: any) => {
        try {
          if (!isFunction(onFulfilled)) {
            onFulfilledNext(value)
          }else {
            let res: any = onFulfilled(value) 
            if(res instanceof XZPromise) {
              res.then(onFulfilledNext, onRejectedNext)
            } else {
              onFulfilledNext(res)
            }
          }
        } catch (err) {
          onFulfilledNext(err)
        }
      }
      const rejected = (error: any) => {
        try {
          if (!isFunction(onRejected)) {
            onRejectedNext(error)
          } else {
            let res: any = onRejected(error)
            if (res instanceof XZPromise) {
              res.then(onFulfilledNext, onRejectedNext)
            } else {
              onFulfilledNext(res)
            }
          }
        } catch (err) {
          onFulfilledNext(err)
        }
      }
      switch (_status) {
        case Status.PENDING:
          this._fulfilledQueues.push(fulfilled)
          this._rejectedQueues.push(rejected)
          break
        case Status.FULFILLED:
          fulfilled(_value)
          break
        case Status.REJECTED:
          rejected(_value)
          break
        default:
          break
      }
    })
  }

  // 添加catch方法
  catch(onRejected: (v: any) => void) {
    return this.then(undefined, onRejected)
  }

  finally(cb: () => void) {
    return this.then(
      value => XZPromise.resolve(cb()).then(() => value),
      reason => XZPromise.resolve(cb()).then(() => { throw reason })
    );
  };
  
}

// new Promise((resolve, reject) => {
//   setTimeout(() => {
//     resolve('FULFILLED')
//   }, 1000)
// }).then((res) => console.log(res))