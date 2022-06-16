// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
//
// Adapted from Node.js. Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// These are simplified versions of the "real" errors in Node.
class NodeFalsyValueRejectionError extends Error {
    reason;
    code = "ERR_FALSY_VALUE_REJECTION";
    constructor(reason){
        super("Promise was rejected with falsy value");
        this.reason = reason;
    }
}
class NodeInvalidArgTypeError extends TypeError {
    code = "ERR_INVALID_ARG_TYPE";
    constructor(argumentName){
        super(`The ${argumentName} argument must be of type function.`);
    }
}
function callbackify(original) {
    if (typeof original !== "function") {
        throw new NodeInvalidArgTypeError('"original"');
    }
    const callbackified = function(...args1) {
        const maybeCb = args1.pop();
        if (typeof maybeCb !== "function") {
            throw new NodeInvalidArgTypeError("last");
        }
        const cb = (...args)=>{
            maybeCb.apply(this, args);
        };
        original.apply(this, args1).then((ret)=>{
            queueMicrotask(cb.bind(this, null, ret));
        }, (rej)=>{
            rej = rej || new NodeFalsyValueRejectionError(rej);
            queueMicrotask(cb.bind(this, rej));
        });
    };
    const descriptors = Object.getOwnPropertyDescriptors(original);
    // It is possible to manipulate a functions `length` or `name` property. This
    // guards against the manipulation.
    if (typeof descriptors.length.value === "number") {
        descriptors.length.value++;
    }
    if (typeof descriptors.name.value === "string") {
        descriptors.name.value += "Callbackified";
    }
    Object.defineProperties(callbackified, descriptors);
    return callbackified;
}
export { callbackify };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL25vZGUvX3V0aWwvX3V0aWxfY2FsbGJhY2tpZnkudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vXG4vLyBBZGFwdGVkIGZyb20gTm9kZS5qcy4gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIFRoZXNlIGFyZSBzaW1wbGlmaWVkIHZlcnNpb25zIG9mIHRoZSBcInJlYWxcIiBlcnJvcnMgaW4gTm9kZS5cbmNsYXNzIE5vZGVGYWxzeVZhbHVlUmVqZWN0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIHB1YmxpYyByZWFzb246IHVua25vd247XG4gIHB1YmxpYyBjb2RlID0gXCJFUlJfRkFMU1lfVkFMVUVfUkVKRUNUSU9OXCI7XG4gIGNvbnN0cnVjdG9yKHJlYXNvbjogdW5rbm93bikge1xuICAgIHN1cGVyKFwiUHJvbWlzZSB3YXMgcmVqZWN0ZWQgd2l0aCBmYWxzeSB2YWx1ZVwiKTtcbiAgICB0aGlzLnJlYXNvbiA9IHJlYXNvbjtcbiAgfVxufVxuY2xhc3MgTm9kZUludmFsaWRBcmdUeXBlRXJyb3IgZXh0ZW5kcyBUeXBlRXJyb3Ige1xuICBwdWJsaWMgY29kZSA9IFwiRVJSX0lOVkFMSURfQVJHX1RZUEVcIjtcbiAgY29uc3RydWN0b3IoYXJndW1lbnROYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgVGhlICR7YXJndW1lbnROYW1lfSBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgZnVuY3Rpb24uYCk7XG4gIH1cbn1cblxudHlwZSBDYWxsYmFjazxSZXN1bHRUPiA9XG4gIHwgKChlcnI6IEVycm9yKSA9PiB2b2lkKVxuICB8ICgoZXJyOiBudWxsLCByZXN1bHQ6IFJlc3VsdFQpID0+IHZvaWQpO1xuXG5mdW5jdGlvbiBjYWxsYmFja2lmeTxSZXN1bHRUPihcbiAgZm46ICgpID0+IFByb21pc2VMaWtlPFJlc3VsdFQ+LFxuKTogKGNhbGxiYWNrOiBDYWxsYmFjazxSZXN1bHRUPikgPT4gdm9pZDtcbmZ1bmN0aW9uIGNhbGxiYWNraWZ5PEFyZ1QsIFJlc3VsdFQ+KFxuICBmbjogKGFyZzogQXJnVCkgPT4gUHJvbWlzZUxpa2U8UmVzdWx0VD4sXG4pOiAoYXJnOiBBcmdULCBjYWxsYmFjazogQ2FsbGJhY2s8UmVzdWx0VD4pID0+IHZvaWQ7XG5mdW5jdGlvbiBjYWxsYmFja2lmeTxBcmcxVCwgQXJnMlQsIFJlc3VsdFQ+KFxuICBmbjogKGFyZzE6IEFyZzFULCBhcmcyOiBBcmcyVCkgPT4gUHJvbWlzZUxpa2U8UmVzdWx0VD4sXG4pOiAoYXJnMTogQXJnMVQsIGFyZzI6IEFyZzJULCBjYWxsYmFjazogQ2FsbGJhY2s8UmVzdWx0VD4pID0+IHZvaWQ7XG5mdW5jdGlvbiBjYWxsYmFja2lmeTxBcmcxVCwgQXJnMlQsIEFyZzNULCBSZXN1bHRUPihcbiAgZm46IChhcmcxOiBBcmcxVCwgYXJnMjogQXJnMlQsIGFyZzM6IEFyZzNUKSA9PiBQcm9taXNlTGlrZTxSZXN1bHRUPixcbik6IChhcmcxOiBBcmcxVCwgYXJnMjogQXJnMlQsIGFyZzM6IEFyZzNULCBjYWxsYmFjazogQ2FsbGJhY2s8UmVzdWx0VD4pID0+IHZvaWQ7XG5mdW5jdGlvbiBjYWxsYmFja2lmeTxBcmcxVCwgQXJnMlQsIEFyZzNULCBBcmc0VCwgUmVzdWx0VD4oXG4gIGZuOiAoXG4gICAgYXJnMTogQXJnMVQsXG4gICAgYXJnMjogQXJnMlQsXG4gICAgYXJnMzogQXJnM1QsXG4gICAgYXJnNDogQXJnNFQsXG4gICkgPT4gUHJvbWlzZUxpa2U8UmVzdWx0VD4sXG4pOiAoXG4gIGFyZzE6IEFyZzFULFxuICBhcmcyOiBBcmcyVCxcbiAgYXJnMzogQXJnM1QsXG4gIGFyZzQ6IEFyZzRULFxuICBjYWxsYmFjazogQ2FsbGJhY2s8UmVzdWx0VD4sXG4pID0+IHZvaWQ7XG5mdW5jdGlvbiBjYWxsYmFja2lmeTxBcmcxVCwgQXJnMlQsIEFyZzNULCBBcmc0VCwgQXJnNVQsIFJlc3VsdFQ+KFxuICBmbjogKFxuICAgIGFyZzE6IEFyZzFULFxuICAgIGFyZzI6IEFyZzJULFxuICAgIGFyZzM6IEFyZzNULFxuICAgIGFyZzQ6IEFyZzRULFxuICAgIGFyZzU6IEFyZzVULFxuICApID0+IFByb21pc2VMaWtlPFJlc3VsdFQ+LFxuKTogKFxuICBhcmcxOiBBcmcxVCxcbiAgYXJnMjogQXJnMlQsXG4gIGFyZzM6IEFyZzNULFxuICBhcmc0OiBBcmc0VCxcbiAgYXJnNTogQXJnNVQsXG4gIGNhbGxiYWNrOiBDYWxsYmFjazxSZXN1bHRUPixcbikgPT4gdm9pZDtcblxuZnVuY3Rpb24gY2FsbGJhY2tpZnk8UmVzdWx0VD4oXG4gIG9yaWdpbmFsOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiBQcm9taXNlTGlrZTxSZXN1bHRUPixcbik6ICguLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQge1xuICBpZiAodHlwZW9mIG9yaWdpbmFsICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB0aHJvdyBuZXcgTm9kZUludmFsaWRBcmdUeXBlRXJyb3IoJ1wib3JpZ2luYWxcIicpO1xuICB9XG5cbiAgY29uc3QgY2FsbGJhY2tpZmllZCA9IGZ1bmN0aW9uICh0aGlzOiB1bmtub3duLCAuLi5hcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICBjb25zdCBtYXliZUNiID0gYXJncy5wb3AoKTtcbiAgICBpZiAodHlwZW9mIG1heWJlQ2IgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhyb3cgbmV3IE5vZGVJbnZhbGlkQXJnVHlwZUVycm9yKFwibGFzdFwiKTtcbiAgICB9XG4gICAgY29uc3QgY2IgPSAoLi4uYXJnczogdW5rbm93bltdKTogdm9pZCA9PiB7XG4gICAgICBtYXliZUNiLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gICAgb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncykudGhlbihcbiAgICAgIChyZXQ6IHVua25vd24pID0+IHtcbiAgICAgICAgcXVldWVNaWNyb3Rhc2soY2IuYmluZCh0aGlzLCBudWxsLCByZXQpKTtcbiAgICAgIH0sXG4gICAgICAocmVqOiB1bmtub3duKSA9PiB7XG4gICAgICAgIHJlaiA9IHJlaiB8fCBuZXcgTm9kZUZhbHN5VmFsdWVSZWplY3Rpb25FcnJvcihyZWopO1xuICAgICAgICBxdWV1ZU1pY3JvdGFzayhjYi5iaW5kKHRoaXMsIHJlaikpO1xuICAgICAgfSxcbiAgICApO1xuICB9O1xuXG4gIGNvbnN0IGRlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob3JpZ2luYWwpO1xuICAvLyBJdCBpcyBwb3NzaWJsZSB0byBtYW5pcHVsYXRlIGEgZnVuY3Rpb25zIGBsZW5ndGhgIG9yIGBuYW1lYCBwcm9wZXJ0eS4gVGhpc1xuICAvLyBndWFyZHMgYWdhaW5zdCB0aGUgbWFuaXB1bGF0aW9uLlxuICBpZiAodHlwZW9mIGRlc2NyaXB0b3JzLmxlbmd0aC52YWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgIGRlc2NyaXB0b3JzLmxlbmd0aC52YWx1ZSsrO1xuICB9XG4gIGlmICh0eXBlb2YgZGVzY3JpcHRvcnMubmFtZS52YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGRlc2NyaXB0b3JzLm5hbWUudmFsdWUgKz0gXCJDYWxsYmFja2lmaWVkXCI7XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoY2FsbGJhY2tpZmllZCwgZGVzY3JpcHRvcnMpO1xuICByZXR1cm4gY2FsbGJhY2tpZmllZDtcbn1cblxuZXhwb3J0IHsgY2FsbGJhY2tpZnkgfTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsRUFBRTtBQUNGLDRFQUE0RTtBQUM1RSxFQUFFO0FBQ0YsMEVBQTBFO0FBQzFFLGdFQUFnRTtBQUNoRSxzRUFBc0U7QUFDdEUsc0VBQXNFO0FBQ3RFLDRFQUE0RTtBQUM1RSxxRUFBcUU7QUFDckUsd0JBQXdCO0FBQ3hCLEVBQUU7QUFDRiwwRUFBMEU7QUFDMUUseURBQXlEO0FBQ3pELEVBQUU7QUFDRiwwRUFBMEU7QUFDMUUsNkRBQTZEO0FBQzdELDRFQUE0RTtBQUM1RSwyRUFBMkU7QUFDM0Usd0VBQXdFO0FBQ3hFLDRFQUE0RTtBQUM1RSx5Q0FBeUM7QUFFekMsOERBQThEO0FBQzlELE1BQU0sNEJBQTRCLFNBQVMsS0FBSztJQUM5QyxBQUFPLE1BQU0sQ0FBVTtJQUN2QixBQUFPLElBQUksR0FBRywyQkFBMkIsQ0FBQztJQUMxQyxZQUFZLE1BQWUsQ0FBRTtRQUMzQixLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUN0QjtDQUNGO0FBQ0QsTUFBTSx1QkFBdUIsU0FBUyxTQUFTO0lBQzdDLEFBQU8sSUFBSSxHQUFHLHNCQUFzQixDQUFDO0lBQ3JDLFlBQVksWUFBb0IsQ0FBRTtRQUNoQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztLQUNqRTtDQUNGO0FBaURELFNBQVMsV0FBVyxDQUNsQixRQUFzRCxFQUN4QjtJQUM5QixJQUFJLE9BQU8sUUFBUSxLQUFLLFVBQVUsRUFBRTtRQUNsQyxNQUFNLElBQUksdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUM7S0FDakQ7SUFFRCxNQUFNLGFBQWEsR0FBRyxTQUF5QixHQUFHLEtBQUksQUFBVyxFQUFRO1FBQ3ZFLE1BQU0sT0FBTyxHQUFHLEtBQUksQ0FBQyxHQUFHLEVBQUUsQUFBQztRQUMzQixJQUFJLE9BQU8sT0FBTyxLQUFLLFVBQVUsRUFBRTtZQUNqQyxNQUFNLElBQUksdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDM0M7UUFDRCxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxBQUFXLEdBQVc7WUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDM0IsQUFBQztRQUNGLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUksQ0FBQyxDQUFDLElBQUksQ0FDN0IsQ0FBQyxHQUFZLEdBQUs7WUFDaEIsY0FBYyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzFDLEVBQ0QsQ0FBQyxHQUFZLEdBQUs7WUFDaEIsR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25ELGNBQWMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3BDLENBQ0YsQ0FBQztLQUNILEFBQUM7SUFFRixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLEFBQUM7SUFDL0QsNkVBQTZFO0lBQzdFLG1DQUFtQztJQUNuQyxJQUFJLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFO1FBQ2hELFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDNUI7SUFDRCxJQUFJLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFO1FBQzlDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLGVBQWUsQ0FBQztLQUMzQztJQUNELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDcEQsT0FBTyxhQUFhLENBQUM7Q0FDdEI7QUFFRCxTQUFTLFdBQVcsR0FBRyJ9