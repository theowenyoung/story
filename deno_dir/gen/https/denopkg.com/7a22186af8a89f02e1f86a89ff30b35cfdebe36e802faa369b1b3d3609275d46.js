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
    /**
  * This class is used to access the twitter api
  * 
  * The link for the implementation rules can be found here:
  * https://developer.twitter.com/en/docs/basics/authentication/guides/authorizing-a-request
  * 
  * [consumerApiKey], [consumerApiSecret], [accessToken], and [accessTokenSecret] 
  * come from the link above. They are unique for each app and user. You will
  * need to generate your own and pass them in when creating the TwitterOauth 
  * object.
  */ constructor(keys, settings){
        this.oauth_consumer_key = keys.consumerApiKey;
        this.oauth_consumer_secret = keys.consumerApiSecret;
        this.oauth_token = keys.accessToken;
        this.oauth_token_secret = keys.accessTokenSecret;
        this.settings = Object.assign({
            apiVersion: '1.1'
        }, settings);
        this.baseUrl = 'https://api.twitter.com/' + this.settings.apiVersion + '/';
    }
    getBaseUrl() {
        return this.baseUrl;
    }
    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
    }
    /** 
   * Makes a get request to the twitter api 
   * The [url] should not include `https://api.twitter.com/1.1/`
   * 
   * Good: `lists/statuses.json`
   * 
   * Bad: `https://api.twitter.com/1.1/lists/statuses.json`
  */ async get(url, options) {
        return await this.request("GET", url, options);
    }
    /** 
   * Makes a post request to the twitter api 
   * The [url] should not include `https://api.twitter.com/1.1/`
   * 
   * Good: `lists/statuses.json`
   * 
   * Bad: `https://api.twitter.com/1.1/lists/statuses.json`
  */ async post(url, options) {
        return await this.request("POST", url, options);
    }
    /** 
   * Makes a post request to the twitter api 
   * The [url] should not include `https://api.twitter.com/1.1/`
   * 
   * Good: `lists/statuses.json`
   * 
   * Bad: `https://api.twitter.com/1.1/lists/statuses.json`
  */ async request(method, url, options) {
        if (options == null) options = {};
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
            headers
        });
        // console.log(authHeader)
        // console.log(request);
        // console.log(headers)
        return await fetch(request);
    // return setTimeout(() => {}, 1000);
    }
    createSignature(oauth_nonce, oauth_timestamp, { options , method , url  }) {
        let signatureString = "";
        let paramPairs = [];
        let params = {
            "oauth_consumer_key": this.oauth_consumer_key,
            "oauth_nonce": oauth_nonce,
            "oauth_signature_method": this.oauth_signature_method,
            "oauth_timestamp": oauth_timestamp,
            "oauth_token": this.oauth_token,
            "oauth_version": this.oauth_version,
            ...options
        };
        for(let k in params){
            let v = params[k];
            paramPairs.push(this.percentEncode(k) + "=" + this.percentEncode(v));
        }
        paramPairs.sort();
        signatureString = method + "&" + this.percentEncode(this.baseUrl + url) + "&" + this.percentEncode(paramPairs.join("&"));
        let signatureBaseString = signatureString;
        let signingKey = this.percentEncode(this.oauth_consumer_secret) + "&" + this.percentEncode(this.oauth_token_secret);
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
        return this.percentEncode(key) + "=\"" + this.percentEncode(value) + "\"";
    }
    percentEncode(val) {
        let encodedVal = encodeURIComponent(val);
        // Adjust for RFC 3986 section 2.2 Reserved Characters 
        let reservedChars = [
            {
                match: /\!/g,
                replace: "%21"
            },
            {
                match: /\#/g,
                replace: "%23"
            },
            {
                match: /\$/g,
                replace: "%24"
            },
            {
                match: /\&/g,
                replace: "%26"
            },
            {
                match: /\'/g,
                replace: "%27"
            },
            {
                match: /\(/g,
                replace: "%28"
            },
            {
                match: /\)/g,
                replace: "%29"
            },
            {
                match: /\*/g,
                replace: "%2A"
            },
            {
                match: /\+/g,
                replace: "%2B"
            },
            {
                match: /\,/g,
                replace: "%2C"
            },
            {
                match: /\//g,
                replace: "%2F"
            },
            {
                match: /\:/g,
                replace: "%3A"
            },
            {
                match: /\;/g,
                replace: "%3B"
            },
            {
                match: /\=/g,
                replace: "%3D"
            },
            {
                match: /\?/g,
                replace: "%3F"
            },
            {
                match: /\@/g,
                replace: "%40"
            },
            {
                match: /\[/g,
                replace: "%5B"
            },
            {
                match: /\]/g,
                replace: "%5D"
            }
        ];
        encodedVal = reservedChars.reduce((tot, { match , replace  })=>{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVub3BrZy5jb20vc3RlZmFudXJvcy9kZW5vX3R3aXR0ZXJfYXBpQHYxLjIuMS90d2l0dGVyQXBpLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGhtYWMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQveC9obWFjQHYyLjAuMS9tb2QudHNcIjtcbmltcG9ydCB7IHY0IH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjUxLjAvdXVpZC9tb2QudHNcIjtcblxuaW50ZXJmYWNlIEtleXMge1xuICBjb25zdW1lckFwaUtleTogc3RyaW5nLFxuICBjb25zdW1lckFwaVNlY3JldDogc3RyaW5nLFxuICBhY2Nlc3NUb2tlbjogc3RyaW5nLFxuICBhY2Nlc3NUb2tlblNlY3JldDogc3RyaW5nLFxufVxuXG5pbnRlcmZhY2UgU2V0dGluZ3Mge1xuICBhcGlWZXJzaW9uOiAnMS4xJyB8ICcyJztcbn1cblxuaW50ZXJmYWNlIE9wdGlvbnMge1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIFR3aXR0ZXJBcGkge1xuICBwcml2YXRlIG9hdXRoX2NvbnN1bWVyX2tleTogc3RyaW5nO1xuICBwcml2YXRlIG9hdXRoX2NvbnN1bWVyX3NlY3JldDogc3RyaW5nO1xuICBwcml2YXRlIG9hdXRoX3Rva2VuOiBzdHJpbmc7XG4gIHByaXZhdGUgb2F1dGhfdG9rZW5fc2VjcmV0OiBzdHJpbmc7XG4gIHByaXZhdGUgc2V0dGluZ3M6IFNldHRpbmdzO1xuXG4gIHByaXZhdGUgYmFzZVVybCA9IFwiaHR0cHM6Ly9hcGkudHdpdHRlci5jb20vMS4xL1wiO1xuICBwcml2YXRlIHJlYWRvbmx5IG9hdXRoX3ZlcnNpb24gPSBcIjEuMFwiO1xuICBwcml2YXRlIHJlYWRvbmx5IG9hdXRoX3NpZ25hdHVyZV9tZXRob2QgPSBcIkhNQUMtU0hBMVwiO1xuXG4gIC8qKlxuICAqIFRoaXMgY2xhc3MgaXMgdXNlZCB0byBhY2Nlc3MgdGhlIHR3aXR0ZXIgYXBpXG4gICogXG4gICogVGhlIGxpbmsgZm9yIHRoZSBpbXBsZW1lbnRhdGlvbiBydWxlcyBjYW4gYmUgZm91bmQgaGVyZTpcbiAgKiBodHRwczovL2RldmVsb3Blci50d2l0dGVyLmNvbS9lbi9kb2NzL2Jhc2ljcy9hdXRoZW50aWNhdGlvbi9ndWlkZXMvYXV0aG9yaXppbmctYS1yZXF1ZXN0XG4gICogXG4gICogW2NvbnN1bWVyQXBpS2V5XSwgW2NvbnN1bWVyQXBpU2VjcmV0XSwgW2FjY2Vzc1Rva2VuXSwgYW5kIFthY2Nlc3NUb2tlblNlY3JldF0gXG4gICogY29tZSBmcm9tIHRoZSBsaW5rIGFib3ZlLiBUaGV5IGFyZSB1bmlxdWUgZm9yIGVhY2ggYXBwIGFuZCB1c2VyLiBZb3Ugd2lsbFxuICAqIG5lZWQgdG8gZ2VuZXJhdGUgeW91ciBvd24gYW5kIHBhc3MgdGhlbSBpbiB3aGVuIGNyZWF0aW5nIHRoZSBUd2l0dGVyT2F1dGggXG4gICogb2JqZWN0LlxuICAqL1xuICBjb25zdHJ1Y3RvcihrZXlzOiBLZXlzLCBzZXR0aW5ncz86IFNldHRpbmdzKSB7XG4gICAgdGhpcy5vYXV0aF9jb25zdW1lcl9rZXkgPSBrZXlzLmNvbnN1bWVyQXBpS2V5O1xuICAgIHRoaXMub2F1dGhfY29uc3VtZXJfc2VjcmV0ID0ga2V5cy5jb25zdW1lckFwaVNlY3JldDtcbiAgICB0aGlzLm9hdXRoX3Rva2VuID0ga2V5cy5hY2Nlc3NUb2tlbjtcbiAgICB0aGlzLm9hdXRoX3Rva2VuX3NlY3JldCA9IGtleXMuYWNjZXNzVG9rZW5TZWNyZXQ7XG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe2FwaVZlcnNpb246ICcxLjEnfSwgc2V0dGluZ3MpO1xuICAgIHRoaXMuYmFzZVVybCA9ICdodHRwczovL2FwaS50d2l0dGVyLmNvbS8nICsgdGhpcy5zZXR0aW5ncy5hcGlWZXJzaW9uICsgJy8nO1xuICB9XG5cbiAgZ2V0QmFzZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmJhc2VVcmw7XG4gIH1cblxuICBzZXRCYXNlVXJsKGJhc2VVcmw6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuYmFzZVVybCA9IGJhc2VVcmw7XG4gIH1cblxuICAvKiogXG4gICAqIE1ha2VzIGEgZ2V0IHJlcXVlc3QgdG8gdGhlIHR3aXR0ZXIgYXBpIFxuICAgKiBUaGUgW3VybF0gc2hvdWxkIG5vdCBpbmNsdWRlIGBodHRwczovL2FwaS50d2l0dGVyLmNvbS8xLjEvYFxuICAgKiBcbiAgICogR29vZDogYGxpc3RzL3N0YXR1c2VzLmpzb25gXG4gICAqIFxuICAgKiBCYWQ6IGBodHRwczovL2FwaS50d2l0dGVyLmNvbS8xLjEvbGlzdHMvc3RhdHVzZXMuanNvbmBcbiAgKi9cbiAgYXN5bmMgZ2V0KHVybDogc3RyaW5nLCBvcHRpb25zPzogT3B0aW9ucyk6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXF1ZXN0KFwiR0VUXCIsIHVybCwgb3B0aW9ucyk7XG4gIH1cblxuICAvKiogXG4gICAqIE1ha2VzIGEgcG9zdCByZXF1ZXN0IHRvIHRoZSB0d2l0dGVyIGFwaSBcbiAgICogVGhlIFt1cmxdIHNob3VsZCBub3QgaW5jbHVkZSBgaHR0cHM6Ly9hcGkudHdpdHRlci5jb20vMS4xL2BcbiAgICogXG4gICAqIEdvb2Q6IGBsaXN0cy9zdGF0dXNlcy5qc29uYFxuICAgKiBcbiAgICogQmFkOiBgaHR0cHM6Ly9hcGkudHdpdHRlci5jb20vMS4xL2xpc3RzL3N0YXR1c2VzLmpzb25gXG4gICovXG4gIGFzeW5jIHBvc3QodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBPcHRpb25zKTogUHJvbWlzZTxSZXNwb25zZT4ge1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnJlcXVlc3QoXCJQT1NUXCIsIHVybCwgb3B0aW9ucyk7XG4gIH1cblxuICAgIC8qKiBcbiAgICogTWFrZXMgYSBwb3N0IHJlcXVlc3QgdG8gdGhlIHR3aXR0ZXIgYXBpIFxuICAgKiBUaGUgW3VybF0gc2hvdWxkIG5vdCBpbmNsdWRlIGBodHRwczovL2FwaS50d2l0dGVyLmNvbS8xLjEvYFxuICAgKiBcbiAgICogR29vZDogYGxpc3RzL3N0YXR1c2VzLmpzb25gXG4gICAqIFxuICAgKiBCYWQ6IGBodHRwczovL2FwaS50d2l0dGVyLmNvbS8xLjEvbGlzdHMvc3RhdHVzZXMuanNvbmBcbiAgKi9cbiAgYXN5bmMgcmVxdWVzdCggbWV0aG9kOiBcIkdFVFwiIHwgXCJQT1NUXCIsIHVybDogc3RyaW5nLCBvcHRpb25zPzogT3B0aW9ucyk6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgICBpZihvcHRpb25zID09IG51bGwpIG9wdGlvbnMgPSB7fTtcblxuICAgIGxldCBvYXV0aF9ub25jZTogc3RyaW5nID0gdGhpcy5nZW5lcmF0ZU5vbmNlKCk7XG4gICAgbGV0IG9hdXRoX3RpbWVzdGFtcDogc3RyaW5nID0gdGhpcy5nZXRDdXJyZW50VGltZXN0YW1wKCk7XG4gICAgbGV0IG9hdXRoX3NpZ25hdHVyZTogc3RyaW5nID0gdGhpcy5jcmVhdGVTaWduYXR1cmUoXG4gICAgICBvYXV0aF9ub25jZSwgXG4gICAgICBvYXV0aF90aW1lc3RhbXAsIFxuICAgICAge1xuICAgICAgICBvcHRpb25zLFxuICAgICAgICBtZXRob2QsXG4gICAgICAgIHVybFxuICAgICAgfSk7XG5cbiAgICBsZXQgYXV0aEhlYWRlcjogc3RyaW5nID0gdGhpcy5jcmVhdGVBdXRoSGVhZGVyKG9hdXRoX25vbmNlLCBvYXV0aF90aW1lc3RhbXAsIG9hdXRoX3NpZ25hdHVyZSk7XG5cbiAgICBsZXQgaGVhZGVycyA9IG5ldyBIZWFkZXJzKHtcbiAgICAgIFwiQXV0aG9yaXphdGlvblwiOiBhdXRoSGVhZGVyLFxuICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICB9KTtcblxuICAgIGxldCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodGhpcy5iYXNlVXJsICsgdXJsICsgXCI/XCIgKyBuZXcgVVJMU2VhcmNoUGFyYW1zKG9wdGlvbnMpLnRvU3RyaW5nKCksIHtcbiAgICAgIG1ldGhvZCxcbiAgICAgIGhlYWRlcnMsXG4gICAgfSk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhhdXRoSGVhZGVyKVxuXG4gICAgLy8gY29uc29sZS5sb2cocmVxdWVzdCk7XG4gICAgLy8gY29uc29sZS5sb2coaGVhZGVycylcblxuICAgIHJldHVybiBhd2FpdCBmZXRjaChyZXF1ZXN0KTtcbiAgICAvLyByZXR1cm4gc2V0VGltZW91dCgoKSA9PiB7fSwgMTAwMCk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVNpZ25hdHVyZShcbiAgICBvYXV0aF9ub25jZTogc3RyaW5nLCBcbiAgICBvYXV0aF90aW1lc3RhbXA6IHN0cmluZywgXG4gICAgeyBvcHRpb25zLCBtZXRob2QsIHVybCB9OiB7IG9wdGlvbnM6IE9wdGlvbnMsIG1ldGhvZDogXCJHRVRcIiB8IFwiUE9TVFwiLCB1cmw6IHN0cmluZyB9XG4gICk6IHN0cmluZyB7XG4gICAgbGV0IHNpZ25hdHVyZVN0cmluZzogc3RyaW5nID0gXCJcIjtcbiAgICBsZXQgcGFyYW1QYWlyczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgcGFyYW1zOiBPcHRpb25zID0ge1xuICAgICAgXCJvYXV0aF9jb25zdW1lcl9rZXlcIjogdGhpcy5vYXV0aF9jb25zdW1lcl9rZXksXG4gICAgICBcIm9hdXRoX25vbmNlXCI6IG9hdXRoX25vbmNlLFxuICAgICAgXCJvYXV0aF9zaWduYXR1cmVfbWV0aG9kXCI6IHRoaXMub2F1dGhfc2lnbmF0dXJlX21ldGhvZCxcbiAgICAgIFwib2F1dGhfdGltZXN0YW1wXCI6IG9hdXRoX3RpbWVzdGFtcCxcbiAgICAgIFwib2F1dGhfdG9rZW5cIjogdGhpcy5vYXV0aF90b2tlbixcbiAgICAgIFwib2F1dGhfdmVyc2lvblwiOiB0aGlzLm9hdXRoX3ZlcnNpb24sXG4gICAgICAuLi5vcHRpb25zLFxuICAgIH07XG5cbiAgICBmb3IobGV0IGsgaW4gcGFyYW1zKSB7XG4gICAgICBsZXQgdiA9IHBhcmFtc1trXTtcbiAgICAgIHBhcmFtUGFpcnMucHVzaCh0aGlzLnBlcmNlbnRFbmNvZGUoaykgKyBcIj1cIiArIHRoaXMucGVyY2VudEVuY29kZSh2KSk7XG4gICAgfVxuXG4gICAgcGFyYW1QYWlycy5zb3J0KCk7XG5cbiAgICBzaWduYXR1cmVTdHJpbmcgPSBtZXRob2QgKyBcIiZcIlxuICAgICAgKyB0aGlzLnBlcmNlbnRFbmNvZGUodGhpcy5iYXNlVXJsICsgdXJsKSArIFwiJlwiXG4gICAgICArIHRoaXMucGVyY2VudEVuY29kZShwYXJhbVBhaXJzLmpvaW4oXCImXCIpKTtcblxuICAgIGxldCBzaWduYXR1cmVCYXNlU3RyaW5nOiBzdHJpbmcgPSBzaWduYXR1cmVTdHJpbmc7XG4gICAgbGV0IHNpZ25pbmdLZXk6IHN0cmluZyA9IHRoaXMucGVyY2VudEVuY29kZSh0aGlzLm9hdXRoX2NvbnN1bWVyX3NlY3JldClcbiAgICAgICsgXCImXCJcbiAgICAgICsgdGhpcy5wZXJjZW50RW5jb2RlKHRoaXMub2F1dGhfdG9rZW5fc2VjcmV0KTtcblxuICAgIGxldCBobWFjU2hhMTogc3RyaW5nID0gaG1hYyhcInNoYTFcIiwgc2lnbmluZ0tleSwgc2lnbmF0dXJlQmFzZVN0cmluZywgXCJ1dGY4XCIsIFwiYmFzZTY0XCIpLnRvU3RyaW5nKCk7XG5cbiAgICByZXR1cm4gaG1hY1NoYTE7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUF1dGhIZWFkZXIoXG4gICAgb2F1dGhfbm9uY2U6IHN0cmluZywgXG4gICAgb2F1dGhfdGltZXN0YW1wOiBzdHJpbmcsIFxuICAgIG9hdXRoX3NpZ25hdHVyZTogc3RyaW5nXG4gICk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFtcbiAgICAgIFwiT0F1dGggXCIsXG4gICAgICB0aGlzLmVuY29kZUF1dGhIZWFkZXJLZXlWYWx1ZVBhaXIoXCJvYXV0aF9jb25zdW1lcl9rZXlcIiwgdGhpcy5vYXV0aF9jb25zdW1lcl9rZXkpICsgXCIsIFwiLFxuICAgICAgdGhpcy5lbmNvZGVBdXRoSGVhZGVyS2V5VmFsdWVQYWlyKFwib2F1dGhfbm9uY2VcIiwgb2F1dGhfbm9uY2UpICsgXCIsIFwiLFxuICAgICAgdGhpcy5lbmNvZGVBdXRoSGVhZGVyS2V5VmFsdWVQYWlyKFwib2F1dGhfc2lnbmF0dXJlXCIsIG9hdXRoX3NpZ25hdHVyZSkgKyBcIiwgXCIsXG4gICAgICB0aGlzLmVuY29kZUF1dGhIZWFkZXJLZXlWYWx1ZVBhaXIoXCJvYXV0aF9zaWduYXR1cmVfbWV0aG9kXCIsIHRoaXMub2F1dGhfc2lnbmF0dXJlX21ldGhvZCkgKyBcIiwgXCIsXG4gICAgICB0aGlzLmVuY29kZUF1dGhIZWFkZXJLZXlWYWx1ZVBhaXIoXCJvYXV0aF90aW1lc3RhbXBcIiwgb2F1dGhfdGltZXN0YW1wKSArIFwiLCBcIixcbiAgICAgIHRoaXMuZW5jb2RlQXV0aEhlYWRlcktleVZhbHVlUGFpcihcIm9hdXRoX3Rva2VuXCIsIHRoaXMub2F1dGhfdG9rZW4pICsgXCIsIFwiLFxuICAgICAgdGhpcy5lbmNvZGVBdXRoSGVhZGVyS2V5VmFsdWVQYWlyKFwib2F1dGhfdmVyc2lvblwiLCB0aGlzLm9hdXRoX3ZlcnNpb24pXG4gICAgXS5qb2luKFwiXCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbmNvZGVBdXRoSGVhZGVyS2V5VmFsdWVQYWlyKGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5wZXJjZW50RW5jb2RlKGtleSlcbiAgICAgICsgXCI9XFxcIlwiXG4gICAgICArIHRoaXMucGVyY2VudEVuY29kZSh2YWx1ZSlcbiAgICAgICsgXCJcXFwiXCI7XG4gIH1cblxuICBwcml2YXRlIHBlcmNlbnRFbmNvZGUodmFsOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGxldCBlbmNvZGVkVmFsOiBzdHJpbmcgPSBlbmNvZGVVUklDb21wb25lbnQodmFsKTtcblxuICAgIC8vIEFkanVzdCBmb3IgUkZDIDM5ODYgc2VjdGlvbiAyLjIgUmVzZXJ2ZWQgQ2hhcmFjdGVycyBcbiAgICBsZXQgcmVzZXJ2ZWRDaGFyczoge21hdGNoOiBSZWdFeHAsIHJlcGxhY2U6IHN0cmluZ31bXSA9IFtcbiAgICAgIHsgbWF0Y2g6IC9cXCEvZywgcmVwbGFjZTogXCIlMjFcIn0sXG4gICAgICB7IG1hdGNoOiAvXFwjL2csIHJlcGxhY2U6IFwiJTIzXCJ9LFxuICAgICAgeyBtYXRjaDogL1xcJC9nLCByZXBsYWNlOiBcIiUyNFwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXCYvZywgcmVwbGFjZTogXCIlMjZcIn0sXG4gICAgICB7IG1hdGNoOiAvXFwnL2csIHJlcGxhY2U6IFwiJTI3XCJ9LFxuICAgICAgeyBtYXRjaDogL1xcKC9nLCByZXBsYWNlOiBcIiUyOFwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXCkvZywgcmVwbGFjZTogXCIlMjlcIn0sXG4gICAgICB7IG1hdGNoOiAvXFwqL2csIHJlcGxhY2U6IFwiJTJBXCJ9LFxuICAgICAgeyBtYXRjaDogL1xcKy9nLCByZXBsYWNlOiBcIiUyQlwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXCwvZywgcmVwbGFjZTogXCIlMkNcIn0sXG4gICAgICB7IG1hdGNoOiAvXFwvL2csIHJlcGxhY2U6IFwiJTJGXCJ9LFxuICAgICAgeyBtYXRjaDogL1xcOi9nLCByZXBsYWNlOiBcIiUzQVwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXDsvZywgcmVwbGFjZTogXCIlM0JcIn0sXG4gICAgICB7IG1hdGNoOiAvXFw9L2csIHJlcGxhY2U6IFwiJTNEXCJ9LFxuICAgICAgeyBtYXRjaDogL1xcPy9nLCByZXBsYWNlOiBcIiUzRlwifSxcbiAgICAgIHsgbWF0Y2g6IC9cXEAvZywgcmVwbGFjZTogXCIlNDBcIn0sXG4gICAgICB7IG1hdGNoOiAvXFxbL2csIHJlcGxhY2U6IFwiJTVCXCJ9LFxuICAgICAgeyBtYXRjaDogL1xcXS9nLCByZXBsYWNlOiBcIiU1RFwifSxcbiAgICBdO1xuXG4gICAgZW5jb2RlZFZhbCA9IHJlc2VydmVkQ2hhcnMucmVkdWNlKCh0b3QsIHttYXRjaCwgcmVwbGFjZX0pID0+IHtcbiAgICAgIHJldHVybiB0b3QucmVwbGFjZShtYXRjaCwgcmVwbGFjZSk7XG4gICAgfSwgZW5jb2RlZFZhbCk7XG5cbiAgICByZXR1cm4gZW5jb2RlZFZhbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVOb25jZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB2NC5nZW5lcmF0ZSgpLnJlcGxhY2UoLy0vZywgXCJcIik7XG4gIH1cblxuICBwcml2YXRlIGdldEN1cnJlbnRUaW1lc3RhbXAoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihuZXcgRGF0ZSgpLnZhbHVlT2YoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLElBQUksUUFBUSx5Q0FBeUM7QUFDOUQsU0FBUyxFQUFFLFFBQVEsMkNBQTJDO0FBaUI5RCxPQUFPLE1BQU07SUFDSCxtQkFBMkI7SUFDM0Isc0JBQThCO0lBQzlCLFlBQW9CO0lBQ3BCLG1CQUEyQjtJQUMzQixTQUFtQjtJQUVuQixVQUFVLCtCQUErQjtJQUNoQyxnQkFBZ0IsTUFBTTtJQUN0Qix5QkFBeUIsWUFBWTtJQUV0RDs7Ozs7Ozs7OztFQVVBLEdBQ0EsWUFBWSxJQUFVLEVBQUUsUUFBbUIsQ0FBRTtRQUMzQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxjQUFjO1FBQzdDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLGlCQUFpQjtRQUNuRCxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssV0FBVztRQUNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxpQkFBaUI7UUFDaEQsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE1BQU0sQ0FBQztZQUFDLFlBQVk7UUFBSyxHQUFHO1FBQ25ELElBQUksQ0FBQyxPQUFPLEdBQUcsNkJBQTZCLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHO0lBQ3pFO0lBRUEsYUFBcUI7UUFDbkIsT0FBTyxJ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