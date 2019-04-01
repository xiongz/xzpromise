import { isFunction } from './utils';
import { Status } from "./enum";
var XZPromise = (function () {
    function XZPromise(handle) {
        if (!isFunction(handle)) {
            throw new Error('XZPromise must accept a function as a parmeter');
        }
        this._status = Status.PENDING;
        this._value = undefined;
        this._fulfilledQueues = [];
        this._rejectedQueues = [];
        try {
            handle.call(this, this._resolve.bind(this), this._reject.bind(this));
        }
        catch (err) {
            this._reject.call(this, err);
        }
    }
    XZPromise.resolve = function (value) {
        if (value instanceof XZPromise)
            return value;
        return new XZPromise(function (resolve) { return resolve(value); });
    };
    XZPromise.reject = function (value) {
        return new XZPromise(function (resolve, reject) { return reject(value); });
    };
    XZPromise.all = function (list) {
        var _this = this;
        return new XZPromise(function (resolve, reject) {
            var values = [];
            var count = 0;
            var _loop_1 = function (i, p) {
                _this.resolve(p).then(function (res) {
                    values[i] = res;
                    count++;
                    if (count === list.length)
                        resolve(values);
                }, function (err) {
                    reject(err);
                });
            };
            for (var _i = 0, _a = list.entries(); _i < _a.length; _i++) {
                var _b = _a[_i], i = _b[0], p = _b[1];
                _loop_1(i, p);
            }
        });
    };
    XZPromise.race = function (list) {
        var _this = this;
        return new XZPromise(function (resolve, reject) {
            for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
                var p = list_1[_i];
                _this.resolve(p).then(function (res) {
                    resolve(res);
                }, function (err) {
                    reject(err);
                });
            }
        });
    };
    XZPromise.prototype._resolve = function (val) {
        if (this._status !== Status.PENDING)
            return;
        this._status = Status.FULFILLED;
        this._value = val;
        var fulfilled;
        while (fulfilled = this._fulfilledQueues.shift()) {
            fulfilled(this._value);
        }
    };
    XZPromise.prototype._reject = function (val) {
        if (this._status !== Status.PENDING)
            return;
        this._status = Status.REJECTED;
        this._value = val;
        var rejected;
        while (rejected = this._rejectedQueues.shift()) {
            rejected(this._value);
        }
    };
    XZPromise.prototype.then = function (onFulfilled, onRejected) {
        var _this = this;
        var _a = this, _value = _a._value, _status = _a._status;
        return new XZPromise(function (onFulfilledNext, onRejectedNext) {
            var fulfilled = function (value) {
                try {
                    if (!isFunction(onFulfilled)) {
                        onFulfilledNext(value);
                    }
                    else {
                        var res = onFulfilled(value);
                        if (res instanceof XZPromise) {
                            res.then(onFulfilledNext, onRejectedNext);
                        }
                        else {
                            onFulfilledNext(res);
                        }
                    }
                }
                catch (err) {
                    onFulfilledNext(err);
                }
            };
            var rejected = function (error) {
                try {
                    if (!isFunction(onRejected)) {
                        onRejectedNext(error);
                    }
                    else {
                        var res = onRejected(error);
                        if (res instanceof XZPromise) {
                            res.then(onFulfilledNext, onRejectedNext);
                        }
                        else {
                            onFulfilledNext(res);
                        }
                    }
                }
                catch (err) {
                    onFulfilledNext(err);
                }
            };
            switch (_status) {
                case Status.PENDING:
                    _this._fulfilledQueues.push(fulfilled);
                    _this._rejectedQueues.push(rejected);
                    break;
                case Status.FULFILLED:
                    fulfilled(_value);
                    break;
                case Status.REJECTED:
                    rejected(_value);
                    break;
                default:
                    break;
            }
        });
    };
    XZPromise.prototype["catch"] = function (onRejected) {
        return this.then(undefined, onRejected);
    };
    XZPromise.prototype["finally"] = function (cb) {
        return this.then(function (value) { return XZPromise.resolve(cb()).then(function () { return value; }); }, function (reason) { return XZPromise.resolve(cb()).then(function () { throw reason; }); });
    };
    ;
    return XZPromise;
}());
