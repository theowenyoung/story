import { init } from "./base.ts";
const lookup = [];
const revLookup = [];
const code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
for(let i = 0, l = code.length; i < l; ++i){
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
}
export const { byteLength , toUint8Array , fromUint8Array  } = init(lookup, revLookup, true);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvYmFzZTY0QHYwLjIuMS9iYXNlNjR1cmwudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaW5pdCB9IGZyb20gXCIuL2Jhc2UudHNcIjtcblxuY29uc3QgbG9va3VwOiBzdHJpbmdbXSA9IFtdO1xuY29uc3QgcmV2TG9va3VwOiBudW1iZXJbXSA9IFtdO1xuY29uc3QgY29kZTogc3RyaW5nID1cbiAgXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OS1fXCI7XG5cbmZvciAobGV0IGk6IG51bWJlciA9IDAsIGwgPSBjb2RlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldO1xuICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGk7XG59XG5cbmV4cG9ydCBjb25zdCB7IGJ5dGVMZW5ndGgsIHRvVWludDhBcnJheSwgZnJvbVVpbnQ4QXJyYXkgfSA9IGluaXQoXG4gIGxvb2t1cCxcbiAgcmV2TG9va3VwLFxuICB0cnVlLFxuKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLElBQUksUUFBUSxZQUFZO0FBRWpDLE1BQU0sU0FBbUIsRUFBRTtBQUMzQixNQUFNLFlBQXNCLEVBQUU7QUFDOUIsTUFBTSxPQUNKO0FBRUYsSUFBSyxJQUFJLElBQVksR0FBRyxJQUFJLEtBQUssTUFBTSxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUc7SUFDbkQsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRTtJQUNuQixTQUFTLENBQUMsS0FBSyxVQUFVLENBQUMsR0FBRyxHQUFHO0FBQ2xDO0FBRUEsT0FBTyxNQUFNLEVBQUUsV0FBVSxFQUFFLGFBQVksRUFBRSxlQUFjLEVBQUUsR0FBRyxLQUMxRCxRQUNBLFdBQ0EsSUFBSSxFQUNKIn0=