const decoder = new TextDecoder();
/**
 * Returns an Uint8Array from standard input
 */ export async function getStdinBuffer(options = {}) {
    const bytes = [];
    while(true){
        // Read bytes one by one
        const buffer = new Uint8Array(1);
        const readStatus = await Deno.stdin.read(buffer);
        // Found EOL
        if (readStatus === null || readStatus === 0) {
            break;
        }
        const byte = buffer[0];
        // On Enter, exit if we are supposed to
        if (byte === 10 && options.exitOnEnter !== false) {
            break;
        }
        bytes.push(byte);
    }
    return Uint8Array.from(bytes);
}
/**
 * Returns a string from standard input
 */ export async function getStdin(options = {}) {
    const buffer = await getStdinBuffer(options);
    return decoder.decode(buffer);
}
/**
 * Returns an Uint8Array from standard input in sync mode
 */ export function getStdinBufferSync(options = {}) {
    const bytes = [];
    while(true){
        // Read bytes one by one
        const buffer = new Uint8Array(1);
        const readStatus = Deno.stdin.readSync(buffer);
        // Found EOL
        if (readStatus === null || readStatus === 0) {
            break;
        }
        const byte = buffer[0];
        // On Enter, exit if we are supposed to
        if (byte === 10 && options.exitOnEnter !== false) {
            break;
        }
        bytes.push(byte);
    }
    return Uint8Array.from(bytes);
}
/**
 * Returns a string from standard input in sync mode
 */ export function getStdinSync(options = {}) {
    const buffer = getStdinBufferSync(options);
    return decoder.decode(buffer);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZ2V0X3N0ZGluQHYxLjEuMC9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcigpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdldFN0ZGluT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBJZiBgdHJ1ZWAsIHN0b3AgcmVhZGluZyB0aGUgc3RkaW4gb25jZSBhIG5ld2xpbmUgY2hhciBpcyByZWFjaGVkXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGV4aXRPbkVudGVyPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIFVpbnQ4QXJyYXkgZnJvbSBzdGFuZGFyZCBpbnB1dFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U3RkaW5CdWZmZXIoXG4gIG9wdGlvbnM6IEdldFN0ZGluT3B0aW9ucyA9IHt9XG4pOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3QgYnl0ZXM6IG51bWJlcltdID0gW107XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICAvLyBSZWFkIGJ5dGVzIG9uZSBieSBvbmVcbiAgICBjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheSgxKTtcbiAgICBjb25zdCByZWFkU3RhdHVzID0gYXdhaXQgRGVuby5zdGRpbi5yZWFkKGJ1ZmZlcik7XG5cbiAgICAvLyBGb3VuZCBFT0xcbiAgICBpZiAocmVhZFN0YXR1cyA9PT0gbnVsbCB8fCByZWFkU3RhdHVzID09PSAwKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb25zdCBieXRlID0gYnVmZmVyWzBdO1xuXG4gICAgLy8gT24gRW50ZXIsIGV4aXQgaWYgd2UgYXJlIHN1cHBvc2VkIHRvXG4gICAgaWYgKGJ5dGUgPT09IDEwICYmIG9wdGlvbnMuZXhpdE9uRW50ZXIgIT09IGZhbHNlKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBieXRlcy5wdXNoKGJ5dGUpO1xuICB9XG5cbiAgcmV0dXJuIFVpbnQ4QXJyYXkuZnJvbShieXRlcyk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIHN0cmluZyBmcm9tIHN0YW5kYXJkIGlucHV0XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTdGRpbihvcHRpb25zOiBHZXRTdGRpbk9wdGlvbnMgPSB7fSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGdldFN0ZGluQnVmZmVyKG9wdGlvbnMpO1xuXG4gIHJldHVybiBkZWNvZGVyLmRlY29kZShidWZmZXIpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gVWludDhBcnJheSBmcm9tIHN0YW5kYXJkIGlucHV0IGluIHN5bmMgbW9kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RkaW5CdWZmZXJTeW5jKG9wdGlvbnM6IEdldFN0ZGluT3B0aW9ucyA9IHt9KTogVWludDhBcnJheSB7XG4gIGNvbnN0IGJ5dGVzOiBudW1iZXJbXSA9IFtdO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgLy8gUmVhZCBieXRlcyBvbmUgYnkgb25lXG4gICAgY29uc3QgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoMSk7XG4gICAgY29uc3QgcmVhZFN0YXR1cyA9IERlbm8uc3RkaW4ucmVhZFN5bmMoYnVmZmVyKTtcblxuICAgIC8vIEZvdW5kIEVPTFxuICAgIGlmIChyZWFkU3RhdHVzID09PSBudWxsIHx8IHJlYWRTdGF0dXMgPT09IDApIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNvbnN0IGJ5dGUgPSBidWZmZXJbMF07XG5cbiAgICAvLyBPbiBFbnRlciwgZXhpdCBpZiB3ZSBhcmUgc3VwcG9zZWQgdG9cbiAgICBpZiAoYnl0ZSA9PT0gMTAgJiYgb3B0aW9ucy5leGl0T25FbnRlciAhPT0gZmFsc2UpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGJ5dGVzLnB1c2goYnl0ZSk7XG4gIH1cblxuICByZXR1cm4gVWludDhBcnJheS5mcm9tKGJ5dGVzKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgc3RyaW5nIGZyb20gc3RhbmRhcmQgaW5wdXQgaW4gc3luYyBtb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGRpblN5bmMob3B0aW9uczogR2V0U3RkaW5PcHRpb25zID0ge30pOiBzdHJpbmcge1xuICBjb25zdCBidWZmZXIgPSBnZXRTdGRpbkJ1ZmZlclN5bmMob3B0aW9ucyk7XG5cbiAgcmV0dXJuIGRlY29kZXIuZGVjb2RlKGJ1ZmZlcik7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxVQUFVLElBQUk7QUFVcEI7O0NBRUMsR0FDRCxPQUFPLGVBQWUsZUFDcEIsVUFBMkIsQ0FBQyxDQUFDLEVBQ1I7SUFDckIsTUFBTSxRQUFrQixFQUFFO0lBRTFCLE1BQU8sSUFBSSxDQUFFO1FBQ1gsd0JBQXdCO1FBQ3hCLE1BQU0sU0FBUyxJQUFJLFdBQVc7UUFDOUIsTUFBTSxhQUFhLE1BQU0sS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBRXpDLFlBQVk7UUFDWixJQUFJLGVBQWUsSUFBSSxJQUFJLGVBQWUsR0FBRztZQUMzQyxLQUFNO1FBQ1IsQ0FBQztRQUVELE1BQU0sT0FBTyxNQUFNLENBQUMsRUFBRTtRQUV0Qix1Q0FBdUM7UUFDdkMsSUFBSSxTQUFTLE1BQU0sUUFBUSxXQUFXLEtBQUssS0FBSyxFQUFFO1lBQ2hELEtBQU07UUFDUixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUM7SUFDYjtJQUVBLE9BQU8sV0FBVyxJQUFJLENBQUM7QUFDekIsQ0FBQztBQUVEOztDQUVDLEdBQ0QsT0FBTyxlQUFlLFNBQVMsVUFBMkIsQ0FBQyxDQUFDLEVBQW1CO0lBQzdFLE1BQU0sU0FBUyxNQUFNLGVBQWU7SUFFcEMsT0FBTyxRQUFRLE1BQU0sQ0FBQztBQUN4QixDQUFDO0FBRUQ7O0NBRUMsR0FDRCxPQUFPLFNBQVMsbUJBQW1CLFVBQTJCLENBQUMsQ0FBQyxFQUFjO0lBQzVFLE1BQU0sUUFBa0IsRUFBRTtJQUUxQixNQUFPLElBQUksQ0FBRTtRQUNYLHdCQUF3QjtRQUN4QixNQUFNLFNBQVMsSUFBSSxXQUFXO1FBQzlCLE1BQU0sYUFBYSxLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUM7UUFFdkMsWUFBWTtRQUNaLElBQUksZUFBZSxJQUFJLElBQUksZUFBZSxHQUFHO1lBQzNDLEtBQU07UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLE1BQU0sQ0FBQyxFQUFFO1FBRXRCLHVDQUF1QztRQUN2QyxJQUFJLFNBQVMsTUFBTSxRQUFRLFdBQVcsS0FBSyxLQUFLLEVBQUU7WUFDaEQsS0FBTTtRQUNSLENBQUM7UUFFRCxNQUFNLElBQUksQ0FBQztJQUNiO0lBRUEsT0FBTyxXQUFXLElBQUksQ0FBQztBQUN6QixDQUFDO0FBRUQ7O0NBRUMsR0FDRCxPQUFPLFNBQVMsYUFBYSxVQUEyQixDQUFDLENBQUMsRUFBVTtJQUNsRSxNQUFNLFNBQVMsbUJBQW1CO0lBRWxDLE9BQU8sUUFBUSxNQUFNLENBQUM7QUFDeEIsQ0FBQyJ9