export async function runScript(expression, locals) {
    let declare = "";
    if (!locals.ctx) {
        locals.ctx = {};
    }
    for(const key in locals){
        if (Object.prototype.hasOwnProperty.call(locals, key)) {
            declare += "const " + key + "=locals['" + key + "'];";
        }
    }
    const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
    return await AsyncFunction("locals", `${declare}
    let scriptResult =  await (async function main() {
      ${expression}
    })();
    return {
      result:scriptResult,
      ctx: ctx,
    };
    `)(locals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvdXRpbHMvcnVuLXNjcmlwdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2NyaXB0KFxuICBleHByZXNzaW9uOiBzdHJpbmcsXG4gIGxvY2FsczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4pIHtcbiAgbGV0IGRlY2xhcmUgPSBcIlwiO1xuICBpZiAoIWxvY2Fscy5jdHgpIHtcbiAgICBsb2NhbHMuY3R4ID0ge307XG4gIH1cbiAgZm9yIChjb25zdCBrZXkgaW4gbG9jYWxzKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChsb2NhbHMsIGtleSkpIHtcbiAgICAgIGRlY2xhcmUgKz0gXCJjb25zdCBcIiArIGtleSArIFwiPWxvY2Fsc1snXCIgKyBrZXkgKyBcIiddO1wiO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IEFzeW5jRnVuY3Rpb24gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXN5bmMgZnVuY3Rpb24gKCkge30pLmNvbnN0cnVjdG9yO1xuICByZXR1cm4gYXdhaXQgKEFzeW5jRnVuY3Rpb24oXG4gICAgXCJsb2NhbHNcIixcbiAgICBgJHtkZWNsYXJlfVxuICAgIGxldCBzY3JpcHRSZXN1bHQgPSAgYXdhaXQgKGFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgICAke2V4cHJlc3Npb259XG4gICAgfSkoKTtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdWx0OnNjcmlwdFJlc3VsdCxcbiAgICAgIGN0eDogY3R4LFxuICAgIH07XG4gICAgYCxcbiAgKSkobG9jYWxzKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLGVBQWUsU0FBUyxDQUM3QixVQUFrQixFQUNsQixNQUErQixFQUMvQjtJQUNBLElBQUksT0FBTyxHQUFHLEVBQUUsQUFBQztJQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtRQUNmLE1BQU0sQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFDRCxJQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBRTtRQUN4QixJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDckQsT0FBTyxJQUFJLFFBQVEsR0FBRyxHQUFHLEdBQUcsV0FBVyxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUM7UUFDeEQsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLGlCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQUFBQztJQUM5RSxPQUFPLE1BQU0sQUFBQyxhQUFhLENBQ3pCLFFBQVEsRUFDUixDQUFDLEVBQUUsT0FBTyxDQUFDOztNQUVULEVBQUUsVUFBVSxDQUFDOzs7Ozs7SUFNZixDQUFDLENBQ0YsQ0FBRSxNQUFNLENBQUMsQ0FBQztBQUNiLENBQUMifQ==