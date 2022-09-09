import { init } from "./base.ts";
const lookup = [];
const revLookup = [];
const code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for(let i = 0, l = code.length; i < l; ++i){
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
}
// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup["-".charCodeAt(0)] = 62;
revLookup["_".charCodeAt(0)] = 63;
export const { byteLength , toUint8Array , fromUint8Array  } = init(lookup, revLookup);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvYmFzZTY0QHYwLjIuMS9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaW5pdCB9IGZyb20gXCIuL2Jhc2UudHNcIjtcblxuY29uc3QgbG9va3VwOiBzdHJpbmdbXSA9IFtdO1xuY29uc3QgcmV2TG9va3VwOiBudW1iZXJbXSA9IFtdO1xuY29uc3QgY29kZTogc3RyaW5nID1cbiAgXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvXCI7XG5cbmZvciAobGV0IGk6IG51bWJlciA9IDAsIGwgPSBjb2RlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldO1xuICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGk7XG59XG5cbi8vIFN1cHBvcnQgZGVjb2RpbmcgVVJMLXNhZmUgYmFzZTY0IHN0cmluZ3MsIGFzIE5vZGUuanMgZG9lcy5cbi8vIFNlZTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQmFzZTY0I1VSTF9hcHBsaWNhdGlvbnNcbnJldkxvb2t1cFtcIi1cIi5jaGFyQ29kZUF0KDApXSA9IDYyO1xucmV2TG9va3VwW1wiX1wiLmNoYXJDb2RlQXQoMCldID0gNjM7XG5cbmV4cG9ydCBjb25zdCB7IGJ5dGVMZW5ndGgsIHRvVWludDhBcnJheSwgZnJvbVVpbnQ4QXJyYXkgfSA9IGluaXQoXG4gIGxvb2t1cCxcbiAgcmV2TG9va3VwLFxuKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLElBQUksUUFBUSxXQUFXLENBQUM7QUFFakMsTUFBTSxNQUFNLEdBQWEsRUFBRSxBQUFDO0FBQzVCLE1BQU0sU0FBUyxHQUFhLEVBQUUsQUFBQztBQUMvQixNQUFNLElBQUksR0FDUixrRUFBa0UsQUFBQztBQUVyRSxJQUFLLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFFO0lBQ25ELE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEMsQ0FBQztBQUVELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDbEMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFbEMsT0FBTyxNQUFNLEVBQUUsVUFBVSxDQUFBLEVBQUUsWUFBWSxDQUFBLEVBQUUsY0FBYyxDQUFBLEVBQUUsR0FBRyxJQUFJLENBQzlELE1BQU0sRUFDTixTQUFTLENBQ1YsQ0FBQyJ9