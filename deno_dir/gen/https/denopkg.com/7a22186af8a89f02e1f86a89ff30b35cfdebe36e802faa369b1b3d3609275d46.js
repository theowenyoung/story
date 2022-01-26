import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";
import { v4 } from "https://deno.land/std@0.51.0/uuid/mod.ts";
export class TwitterApi {
    oauth_consumer_key;
    oauth_consumer_secret;
    oauth_token;
    oauth_token_secret;
    settings;
    baseUrl = "https://api.twitter.com/1.1/";
    oauth_version = "1.0";
    oauth_signature_method = "HMAC-SHA1";
    constructor(keys, settings) {
        this.oauth_consumer_key = keys.consumerApiKey;
        this.oauth_consumer_secret = keys.consumerApiSecret;
        this.oauth_token = keys.accessToken;
        this.oauth_token_secret = keys.accessTokenSecret;
        this.settings = Object.assign({ apiVersion: '1.1' }, settings);
        this.baseUrl = 'https://api.twitter.com/' + this.settings.apiVersion + '/';
    }
    getBaseUrl() {
        return this.baseUrl;
    }
    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async get(url, options) {
        return await this.request("GET", url, options);
    }
    async post(url, options) {
        return await this.request("POST", url, options);
    }
    async request(method, url, options) {
        if (options == null)
            options = {};
        let oauth_nonce = this.generateNonce();
        let oauth_timestamp = this.getCurrentTimestamp();
        let oauth_signature = this.createSignature(oauth_nonce, oauth_timestamp, {
            options,
            method,
            url
        });
        let authHeader = this.createAuthHeader(oauth_nonce, oauth_timestamp, oauth_signature);
        let headers = new Headers({
            "Authorization": authHeader,
            "Content-Type": "application/json"
        });
        let request = new Request(this.baseUrl + url + "?" + new URLSearchParams(options).toString(), {
            method,
            headers,
        });
        return await fetch(request);
    }
    createSignature(oauth_nonce, oauth_timestamp, { options, method, url }) {
        let signatureString = "";
        let paramPairs = [];
        let params = {
            "oauth_consumer_key": this.oauth_consumer_key,
            "oauth_nonce": oauth_nonce,
            "oauth_signature_method": this.oauth_signature_method,
            "oauth_timestamp": oauth_timestamp,
            "oauth_token": this.oauth_token,
            "oauth_version": this.oauth_version,
            ...options,
        };
        for (let k in params) {
            let v = params[k];
            paramPairs.push(this.percentEncode(k) + "=" + this.percentEncode(v));
        }
        paramPairs.sort();
        signatureString = method + "&"
            + this.percentEncode(this.baseUrl + url) + "&"
            + this.percentEncode(paramPairs.join("&"));
        let signatureBaseString = signatureString;
        let signingKey = this.percentEncode(this.oauth_consumer_secret)
            + "&"
            + this.percentEncode(this.oauth_token_secret);
        let hmacSha1 = hmac("sha1", signingKey, signatureBaseString, "utf8", "base64").toString();
        return hmacSha1;
    }
    createAuthHeader(oauth_nonce, oauth_timestamp, oauth_signature) {
        return [
            "OAuth ",
            this.encodeAuthHeaderKeyValuePair("oauth_consumer_key", this.oauth_consumer_key) + ", ",
            this.encodeAuthHeaderKeyValuePair("oauth_nonce", oauth_nonce) + ", ",
            this.encodeAuthHeaderKeyValuePair("oauth_signature", oauth_signature) + ", ",
            this.encodeAuthHeaderKeyValuePair("oauth_signature_method", this.oauth_signature_method) + ", ",
            this.encodeAuthHeaderKeyValuePair("oauth_timestamp", oauth_timestamp) + ", ",
            this.encodeAuthHeaderKeyValuePair("oauth_token", this.oauth_token) + ", ",
            this.encodeAuthHeaderKeyValuePair("oauth_version", this.oauth_version)
        ].join("");
    }
    encodeAuthHeaderKeyValuePair(key, value) {
        return this.percentEncode(key)
            + "=\""
            + this.percentEncode(value)
            + "\"";
    }
    percentEncode(val) {
        let encodedVal = encodeURIComponent(val);
        let reservedChars = [
            { match: /\!/g, replace: "%21" },
            { match: /\#/g, replace: "%23" },
            { match: /\$/g, replace: "%24" },
            { match: /\&/g, replace: "%26" },
            { match: /\'/g, replace: "%27" },
            { match: /\(/g, replace: "%28" },
            { match: /\)/g, replace: "%29" },
            { match: /\*/g, replace: "%2A" },
            { match: /\+/g, replace: "%2B" },
            { match: /\,/g, replace: "%2C" },
            { match: /\//g, replace: "%2F" },
            { match: /\:/g, replace: "%3A" },
            { match: /\;/g, replace: "%3B" },
            { match: /\=/g, replace: "%3D" },
            { match: /\?/g, replace: "%3F" },
            { match: /\@/g, replace: "%40" },
            { match: /\[/g, replace: "%5B" },
            { match: /\]/g, replace: "%5D" },
        ];
        encodedVal = reservedChars.reduce((tot, { match, replace }) => {
            return tot.replace(match, replace);
        }, encodedVal);
        return encodedVal;
    }
    generateNonce() {
        return v4.generate().replace(/-/g, "");
    }
    getCurrentTimestamp() {
        return Math.floor(new Date().valueOf() / 1000).toString();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHdpdHRlckFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInR3aXR0ZXJBcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQWlCOUQsTUFBTSxPQUFPLFVBQVU7SUFDYixrQkFBa0IsQ0FBUztJQUMzQixxQkFBcUIsQ0FBUztJQUM5QixXQUFXLENBQVM7SUFDcEIsa0JBQWtCLENBQVM7SUFDM0IsUUFBUSxDQUFXO0lBRW5CLE9BQU8sR0FBRyw4QkFBOEIsQ0FBQztJQUNoQyxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLHNCQUFzQixHQUFHLFdBQVcsQ0FBQztJQWF0RCxZQUFZLElBQVUsRUFBRSxRQUFtQjtRQUN6QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUM5QyxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1FBQ3BELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNwQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1FBQ2pELElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsT0FBTyxHQUFHLDBCQUEwQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztJQUM3RSxDQUFDO0lBRUQsVUFBVTtRQUNSLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUN0QixDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWU7UUFDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDekIsQ0FBQztJQVVE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QUMvQixJQUFJLFVBQVUsR0FBVyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUdqRCxJQUFJLGFBQWEsR0FBdUM7WUFDdEQsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7WUFDL0IsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUM7U0FDaEMsQ0FBQztRQUVGLFVBQVUsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUMsS0FBSyxFQUFFLE9BQU8sRUFBQyxFQUFFLEVBQUU7WUFDMUQsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFZixPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRU8sYUFBYTtRQUNuQixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFTyxtQkFBbUI7UUFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDNUQsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaG1hYyB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC94L2htYWNAdjIuMC4xL21vZC50c1wiO1xuaW1wb3J0IHsgdjQgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQDAuNTEuMC91dWlkL21vZC50c1wiO1xuXG5pbnRlcmZhY2UgS2V5cyB7XG4gIGNvbnN1bWVyQXBpS2V5OiBzdHJpbmcsXG4gIGNvbnN1bWVyQXBpU2VjcmV0OiBzdHJpbmcsXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmcsXG4gIGFjY2Vzc1Rva2VuU2VjcmV0OiBzdHJpbmcsXG59XG5cbmludGVyZmFjZSBTZXR0aW5ncyB7XG4gIGFwaVZlcnNpb246ICcxLjEnIHwgJzInO1xufVxuXG5pbnRlcmZhY2UgT3B0aW9ucyB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZ1xufVxuXG5leHBvcnQgY2xhc3MgVHdpdHRlckFwaSB7XG4gIHByaXZhdGUgb2F1dGhfY29uc3VtZXJfa2V5OiBzdHJpbmc7XG4gIHByaXZhdGUgb2F1dGhfY29uc3VtZXJfc2VjcmV0OiBzdHJpbmc7XG4gIHByaXZhdGUgb2F1dGhfdG9rZW46IHN0cmluZztcbiAgcHJpdmF0ZSBvYXV0aF90b2tlbl9zZWNyZXQ6IHN0cmluZztcbiAgcHJpdmF0ZSBzZXR0aW5nczogU2V0dGluZ3M7XG5cbiAgcHJpdmF0ZSBiYXNlVXJsID0gXCJodHRwczovL2FwaS50d2l0dGVyLmNvbS8xLjEvXCI7XG4gIHByaXZhdGUgcmVhZG9ubHkgb2F1dGhfdmVyc2lvbiA9IFwiMS4wXCI7XG4gIHByaXZhdGUgcmVhZG9ubHkgb2F1dGhfc2lnbmF0dXJlX21ldGhvZCA9IFwiSE1BQy1TSEExXCI7XG5cbiAgLyoqXG4gICogVGhpcyBjbGFzcyBpcyB1c2VkIHRvIGFjY2VzcyB0aGUgdHdpdHRlciBhcGlcbiAgKiBcbiAgKiBUaGUgbGluayBmb3IgdGhlIGltcGxlbWVudGF0aW9uIHJ1bGVzIGNhbiBiZSBmb3VuZCBoZXJlOlxuICAqIGh0dHBzOi8vZGV2ZWxvcGVyLnR3aXR0ZXIuY29tL2VuL2RvY3MvYmFzaWNzL2F1dGhlbnRpY2F0aW9uL2d1aWRlcy9hdXRob3JpemluZy1hLXJlcXVlc3RcbiAgKiBcbiAgKiBbY29uc3VtZXJBcGlLZXldLCBbY29uc3VtZXJBcGlTZWNyZXRdLCBbYWNjZXNzVG9rZW5dLCBhbmQgW2FjY2Vzc1Rva2VuU2VjcmV0XSBcbiAgKiBjb21lIGZyb20gdGhlIGxpbmsgYWJvdmUuIFRoZXkgYXJlIHVuaXF1ZSBmb3IgZWFjaCBhcHAgYW5kIHVzZXIuIFlvdSB3aWxsXG4gICogbmVlZCB0byBnZW5lcmF0ZSB5b3VyIG93biBhbmQgcGFzcyB0aGVtIGluIHdoZW4gY3JlYXRpbmcgdGhlIFR3aXR0ZXJPYXV0aCBcbiAgKiBvYmplY3QuXG4gICovXG4gIGNvbnN0cnVjdG9yKGtleXM6IEtleXMsIHNldHRpbmdzPzogU2V0dGluZ3MpIHtcbiAgICB0aGlzLm9hdXRoX2NvbnN1bWVyX2tleSA9IGtleXMuY29uc3VtZXJBcGlLZXk7XG4gICAgdGhpcy5vYXV0aF9jb25zdW1lcl9zZWNyZXQgPSBrZXlzLmNvbnN1bWVyQXBpU2VjcmV0O1xuICAgIHRoaXMub2F1dGhfdG9rZW4gPSBrZXlzLmFjY2Vzc1Rva2VuO1xuICAgIHRoaXMub2F1dGhfdG9rZW5fc2VjcmV0ID0ga2V5cy5hY2Nlc3NUb2tlblNlY3JldDtcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7YXBpVmVyc2lvbjogJzEuMSd9LCBzZXR0aW5ncyk7XG4gICAgdGhpcy5iYXNlVXJsID0gJ2h0dHBzOi8vYXBpLnR3aXR0ZXIuY29tLycgKyB0aGlzLnNldHRpbmdzLmFwaVZlcnNpb24gKyAnLyc7XG4gIH1cblxuICBnZXRCYXNlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYmFzZVVybDtcbiAgfVxuXG4gIHNldEJhc2VVcmwoYmFzZVVybDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5iYXNlVXJsID0gYmFzZVVybDtcbiAgfVxuXG4gIC8qKiBcbiAgICogTWFrZXMgYSBnZXQgcmVxdWVzdCB0byB0aGUgdHdpdHRlciBhcGkgXG4gICAqIFRoZSBbdXJsXSBzaG91bGQgbm90IGluY2x1ZGUgYGh0dHBzOi8vYXBpLnR3aXR0ZXIuY29tLzEuMS9gXG4gICAqIFxuICAgKiBHb29kOiBgbGlzdHMvc3RhdHVzZXMuanNvbmBcbiAgICogXG4gICAqIEJhZDogYGh0dHBzOi8vYXBpLnR3aXR0ZXIuY29tLzEuMS9saXN0cy9zdGF0dXNlcy5qc29uYFxuICAqL1xuICBhc3luYyBnZXQodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBPcHRpb25zKTogUHJvbWlzZTxSZXNwb25zZT4ge1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnJlcXVlc3QoXCJHRVRcIiwgdXJsLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKiBcbiAgICogTWFrZXMgYSBwb3N0IHJlcXVlc3QgdG8gdGhlIHR3aXR0ZXIgYXBpIFxuICAgKiBUaGUgW3VybF0gc2hvdWxkIG5vdCBpbmNsdWRlIGBodHRwczovL2FwaS50d2l0dGVyLmNvbS8xLjEvYFxuICAgKiBcbiAgICogR29vZDogYGxpc3RzL3N0YXR1c2VzLmpzb25gXG4gICAqIFxuICAgKiBCYWQ6IGBodHRwczovL2FwaS50d2l0dGVyLmNvbS8xLjEvbGlzdHMvc3RhdHVzZXMuanNvbmBcbiAgKi9cbiAgYXN5bmMgcG9zdCh1cmw6IHN0cmluZywgb3B0aW9ucz86IE9wdGlvbnMpOiBQcm9taXNlPFJlc3BvbnNlPiB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucmVxdWVzdChcIlBPU1RcIiwgdXJsLCBvcHRpb25zKTtcbiAgfVxuXG4gICAgLyoqIFxuICAgKiBNYWtlcyBhIHBvc3QgcmVxdWVzdCB0byB0aGUgdHdpdHRlciBhcGkgXG4gICAqIFRoZSBbdXJsXSBzaG91bGQgbm90IGluY2x1ZGUgYGh0dHBzOi8vYXBpLnR3aXR0ZXIuY29tLzEuMS9gXG4gICAqIFxuICAgKiBHb29kOiBgbGlzdHMvc3RhdHVzZXMuanNvbmBcbiAgICogXG4gICAqIEJhZDogYGh0dHBzOi8vYXBpLnR3aXR0ZXIuY29tLzEuMS9saXN0cy9zdGF0dXNlcy5qc29uYFxuICAqL1xuICBhc3luYyByZXF1ZXN0KCBtZXRob2Q6IFwiR0VUXCIgfCBcIlBPU1RcIiwgdXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBPcHRpb25zKTogUHJvbWlzZTxSZXNwb25zZT4ge1xuICAgIGlmKG9wdGlvbnMgPT0gbnVsbCkgb3B0aW9ucyA9IHt9O1xuXG4gICAgbGV0IG9hdXRoX25vbmNlOiBzdHJpbmcgPSB0aGlzLmdlbmVyYXRlTm9uY2UoKTtcbiAgICBsZXQgb2F1dGhfdGltZXN0YW1wOiBzdHJpbmcgPSB0aGlzLmdldEN1cnJlbnRUaW1lc3RhbXAoKTtcbiAgICBsZXQgb2F1dGhfc2lnbmF0dXJlOiBzdHJpbmcgPSB0aGlzLmNyZWF0ZVNpZ25hdHVyZShcbiAgICAgIG9hdXRoX25vbmNlLCBcbiAgICAgIG9hdXRoX3RpbWVzdGFtcCwgXG4gICAgICB7XG4gICAgICAgIG9wdGlvbnMsXG4gICAgICAgIG1ldGhvZCxcbiAgICAgICAgdXJsXG4gICAgICB9KTtcblxuICAgIGxldCBhdXRoSGVhZGVyOiBzdHJpbmcgPSB0aGlzLmNyZWF0ZUF1dGhIZWFkZXIob2F1dGhfbm9uY2UsIG9hdXRoX3RpbWVzdGFtcCwgb2F1dGhfc2lnbmF0dXJlKTtcblxuICAgIGxldCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoe1xuICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGF1dGhIZWFkZXIsXG4gICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIH0pO1xuXG4gICAgbGV0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdCh0aGlzLmJhc2VVcmwgKyB1cmwgKyBcIj9cIiArIG5ldyBVUkxTZWFyY2hQYXJhbXMob3B0aW9ucykudG9TdHJpbmcoKSwge1xuICAgICAgbWV0aG9kLFxuICAgICAgaGVhZGVycyxcbiAgICB9KTtcblxuICAgIC8vIGNvbnNvbGUubG9nKGF1dGhIZWFkZXIpXG5cbiAgICAvLyBjb25zb2xlLmxvZyhyZXF1ZXN0KTtcbiAgICAvLyBjb25zb2xlLmxvZyhoZWFkZXJzKVxuXG4gICAgcmV0dXJuIGF3YWl0IGZldGNoKHJlcXVlc3QpO1xuICAgIC8vIHJldHVybiBzZXRUaW1lb3V0KCgpID0+IHt9LCAxMDAwKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2lnbmF0dXJlKFxuICAgIG9hdXRoX25vbmNlOiBzdHJpbmcsIFxuICAgIG9hdXRoX3RpbWVzdGFtcDogc3RyaW5nLCBcbiAgICB7IG9wdGlvbnMsIG1ldGhvZCwgdXJsIH06IHsgb3B0aW9uczogT3B0aW9ucywgbWV0aG9kOiBcIkdFVFwiIHwgXCJQT1NUXCIsIHVybDogc3RyaW5nIH1cbiAgKTogc3RyaW5nIHtcbiAgICBsZXQgc2lnbmF0dXJlU3RyaW5nOiBzdHJpbmcgPSBcIlwiO1xuICAgIGxldCBwYXJhbVBhaXJzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBwYXJhbXM6IE9wdGlvbnMgPSB7XG4gICAgICBcIm9hdXRoX2NvbnN1bWVyX2tleVwiOiB0aGlzLm9hdXRoX2NvbnN1bWVyX2tleSxcbiAgICAgIFwib2F1dGhfbm9uY2VcIjogb2F1dGhfbm9uY2UsXG4gICAgICBcIm9hdXRoX3NpZ25hdHVyZV9tZXRob2RcIjogdGhpcy5vYXV0aF9zaWduYXR1cmVfbWV0aG9kLFxuICAgICAgXCJvYXV0aF90aW1lc3RhbXBcIjogb2F1dGhfdGltZXN0YW1wLFxuICAgICAgXCJvYXV0aF90b2tlblwiOiB0aGlzLm9hdXRoX3Rva2VuLFxuICAgICAgXCJvYXV0aF92ZXJzaW9uXCI6IHRoaXMub2F1dGhfdmVyc2lvbixcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgfTtcblxuICAgIGZvcihsZXQgayBpbiBwYXJhbXMpIHtcbiAgICAgIGxldCB2ID0gcGFyYW1zW2tdO1xuICAgICAgcGFyYW1QYWlycy5wdXNoKHRoaXMucGVyY2VudEVuY29kZShrKSArIFwiPVwiICsgdGhpcy5wZXJjZW50RW5jb2RlKHYpKTtcbiAgICB9XG5cbiAgICBwYXJhbVBhaXJzLnNvcnQoKTtcblxuICAgIHNpZ25hdHVyZVN0cmluZyA9IG1ldGhvZCArIFwiJlwiXG4gICAgICArIHRoaXMucGVyY2VudEVuY29kZSh0aGlzLmJhc2VVcmwgKyB1cmwpICsgXCImXCJcbiAgICAgICsgdGhpcy5wZXJjZW50RW5jb2RlKHBhcmFtUGFpcnMuam9pbihcIiZcIikpO1xuXG4gICAgbGV0IHNpZ25hdHVyZUJhc2VTdHJpbmc6IHN0cmluZyA9IHNpZ25hdHVyZVN0cmluZztcbiAgICBsZXQgc2lnbmluZ0tleTogc3RyaW5nID0gdGhpcy5wZXJjZW50RW5jb2RlKHRoaXMub2F1dGhfY29uc3VtZXJfc2VjcmV0KVxuICAgICAgKyBcIiZcIlxuICAgICAgKyB0aGlzLnBlcmNlbnRFbmNvZGUodGhpcy5vYXV0aF90b2tlbl9zZWNyZXQpO1xuXG4gICAgbGV0IGhtYWNTaGExOiBzdHJpbmcgPSBobWFjKFwic2hhMVwiLCBzaWduaW5nS2V5LCBzaWduYXR1cmVCYXNlU3RyaW5nLCBcInV0ZjhcIiwgXCJiYXNlNjRcIikudG9TdHJpbmcoKTtcblxuICAgIHJldHVybiBobWFjU2hhMTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXV0aEhlYWRlcihcbiAgICBvYXV0aF9ub25jZTogc3RyaW5nLCBcbiAgICBvYXV0aF90aW1lc3RhbXA6IHN0cmluZywgXG4gICAgb2F1dGhfc2lnbmF0dXJlOiBzdHJpbmdcbiAgKTogc3RyaW5nIHtcbiAgICByZXR1cm4gW1xuICAgICAgXCJPQXV0aCBcIixcbiAgICAgIHRoaXMuZW5jb2RlQXV0aEhlYWRlcktleVZhbHVlUGFpcihcIm9hdXRoX2NvbnN1bWVyX2tleVwiLCB0aGlzLm9hdXRoX2NvbnN1bWVyX2tleSkgKyBcIiwgXCIsXG4gICAgICB0aGlzLmVuY29kZUF1dGhIZWFkZXJLZXlWYWx1ZVBhaXIoXCJvYXV0aF9ub25jZVwiLCBvYXV0aF9ub25jZSkgKyBcIiwgXCIsXG4gICAgICB0aGlzLmVuY29kZUF1dGhIZWFkZXJLZXlWYWx1ZVBhaXIoXCJvYXV0aF9zaWduYXR1cmVcIiwgb2F1dGhfc2lnbmF0dXJlKSArIFwiLCBcIixcbiAgICAgIHRoaXMuZW5jb2RlQXV0aEhlYWRlcktleVZhbHVlUGFpcihcIm9hdXRoX3NpZ25hdHVyZV9tZXRob2RcIiwgdGhpcy5vYXV0aF9zaWduYXR1cmVfbWV0aG9kKSArIFwiLCBcIixcbiAgICAgIHRoaXMuZW5jb2RlQXV0aEhlYWRlcktleVZhbHVlUGFpcihcIm9hdXRoX3RpbWVzdGFtcFwiLCBvYXV0aF90aW1lc3RhbXApICsgXCIsIFwiLFxuICAgICAgdGhpcy5lbmNvZGVBdXRoSGVhZGVyS2V5VmFsdWVQYWlyKFwib2F1dGhfdG9rZW5cIiwgdGhpcy5vYXV0aF90b2tlbikgKyBcIiwgXCIsXG4gICAgICB0aGlzLmVuY29kZUF1dGhIZWFkZXJLZXlWYWx1ZVBhaXIoXCJvYXV0aF92ZXJzaW9uXCIsIHRoaXMub2F1dGhfdmVyc2lvbilcbiAgICBdLmpvaW4oXCJcIik7XG4gIH1cblxuICBwcml2YXRlIGVuY29kZUF1dGhIZWFkZXJLZXlWYWx1ZVBhaXIoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnBlcmNlbnRFbmNvZGUoa2V5KVxuICAgICAgKyBcIj1cXFwiXCJcbiAgICAgICsgdGhpcy5wZXJjZW50RW5jb2RlKHZhbHVlKVxuICAgICAgKyBcIlxcXCJcIjtcbiAgfVxuXG4gIHByaXZhdGUgcGVyY2VudEVuY29kZSh2YWw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgbGV0IGVuY29kZWRWYWw6IHN0cmluZyA9IGVuY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG4gICAgLy8gQWRqdXN0IGZvciBSRkMgMzk4NiBzZWN0aW9uIDIuMiBSZXNlcnZlZCBDaGFyYWN0ZXJzIFxuICAgIGxldCByZXNlcnZlZENoYXJzOiB7bWF0Y2g6IFJlZ0V4cCwgcmVwbGFjZTogc3RyaW5nfVtdID0gW1xuICAgICAgeyBtYXRjaDogL1xcIS9nLCByZXBsYWNlOiBcIiUyMVwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXCMvZywgcmVwbGFjZTogXCIlMjNcIn0sXG4gICAgICB7IG1hdGNoOiAvXFwkL2csIHJlcGxhY2U6IFwiJTI0XCJ9LFxuICAgICAgeyBtYXRjaDogL1xcJi9nLCByZXBsYWNlOiBcIiUyNlwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXCcvZywgcmVwbGFjZTogXCIlMjdcIn0sXG4gICAgICB7IG1hdGNoOiAvXFwoL2csIHJlcGxhY2U6IFwiJTI4XCJ9LFxuICAgICAgeyBtYXRjaDogL1xcKS9nLCByZXBsYWNlOiBcIiUyOVwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXCovZywgcmVwbGFjZTogXCIlMkFcIn0sXG4gICAgICB7IG1hdGNoOiAvXFwrL2csIHJlcGxhY2U6IFwiJTJCXCJ9LFxuICAgICAgeyBtYXRjaDogL1xcLC9nLCByZXBsYWNlOiBcIiUyQ1wifSxcbiAgICAgIHsgbWF0Y2g6IC9cXC8vZywgcmVwbGFjZTogXCIlMkZcIn0sXG4gICAgICB7IG1hdGNoOiAvXFw6L2csIHJlcGxhY2U6IFwiJTNBXCJ9LFxuICAgICAgeyBtYXRjaDogL1xcOy9nLCByZXBsYWNlOiBcIiUzQlwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXD0vZywgcmVwbGFjZTogXCIlM0RcIn0sXG4gICAgICB7IG1hdGNoOiAvXFw/L2csIHJlcGxhY2U6IFwiJTNGXCJ9LFxuICAgICAgeyBtYXRjaDogL1xcQC9nLCByZXBsYWNlOiBcIiU0MFwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXFsvZywgcmVwbGFjZTogXCIlNUJcIn0sXG4gICAgICB7IG1hdGNoOiAvXFxdL2csIHJlcGxhY2U6IFwiJTVEXCJ9LFxuICAgIF07XG5cbiAgICBlbmNvZGVkVmFsID0gcmVzZXJ2ZWRDaGFycy5yZWR1Y2UoKHRvdCwge21hdGNoLCByZXBsYWNlfSkgPT4ge1xuICAgICAgcmV0dXJuIHRvdC5yZXBsYWNlKG1hdGNoLCByZXBsYWNlKTtcbiAgICB9LCBlbmNvZGVkVmFsKTtcblxuICAgIHJldHVybiBlbmNvZGVkVmFsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZU5vbmNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHY0LmdlbmVyYXRlKCkucmVwbGFjZSgvLS9nLCBcIlwiKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q3VycmVudFRpbWVzdGFtcCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBNYXRoLmZsb29yKG5ldyBEYXRlKCkudmFsdWVPZigpIC8gMTAwMCkudG9TdHJpbmcoKTtcbiAgfVxufVxuIl19