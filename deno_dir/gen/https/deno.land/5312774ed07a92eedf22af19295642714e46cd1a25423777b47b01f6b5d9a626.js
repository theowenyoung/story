/**
 * @author: lencx
 * @create_at: Jun 14, 2020
 */ /**
 * @method fmtFileSize
 * @param {number} bytes
 * @param {boolean} bits - enables bit sizes, default is `false`
 * @param {number} dp - decimal place, default is `2`
 * @see https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
 */ export function fmtFileSize(bytes, bit = false, dp = 2) {
    const thresh = bit ? 1000 : 1024;
    if (bytes <= 0) {
        return '0 B';
    }
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    const units = bit ? [
        'KB',
        'MB',
        'GB',
        'TB',
        'PB',
        'EB',
        'ZB',
        'YB'
    ] : [
        'KiB',
        'MiB',
        'GiB',
        'TiB',
        'PiB',
        'EiB',
        'ZiB',
        'YiB'
    ];
    let u = -1;
    const r = 10 ** dp;
    do {
        bytes /= thresh;
        ++u;
    }while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)
    return `${bytes.toFixed(dp)} ${units[u]}`;
}
export const isStr = (arg)=>typeof arg === 'string';
// exists directory or file
export const exists = async (filename)=>{
    try {
        await Deno.stat(filename);
        return true;
    } catch (e) {
        return false;
    }
};
// https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript
export const fileExt = (fname)=>fname.slice((fname.lastIndexOf('.') - 1 >>> 0) + 2);
// example: './a/b/' => 'a/b'
export const trimPath = (path)=>{
    // example: './a/b/' => './a/b'
    if (/\/$/.test(path)) path = path.slice(0, -1);
    // example: './a/b' => 'a/b'
    if (/^\.\//.test(path)) path = path.slice(2);
    return path;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZ2V0ZmlsZXNAdjEuMC4wL3V0aWxzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGF1dGhvcjogbGVuY3hcbiAqIEBjcmVhdGVfYXQ6IEp1biAxNCwgMjAyMFxuICovXG5cbi8qKlxuICogQG1ldGhvZCBmbXRGaWxlU2l6ZVxuICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGJpdHMgLSBlbmFibGVzIGJpdCBzaXplcywgZGVmYXVsdCBpcyBgZmFsc2VgXG4gKiBAcGFyYW0ge251bWJlcn0gZHAgLSBkZWNpbWFsIHBsYWNlLCBkZWZhdWx0IGlzIGAyYFxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDQyMDM1Mi9jb252ZXJ0aW5nLWZpbGUtc2l6ZS1pbi1ieXRlcy10by1odW1hbi1yZWFkYWJsZS1zdHJpbmcvMTA0MjA0MDRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZtdEZpbGVTaXplKGJ5dGVzOiBudW1iZXIsIGJpdDogYm9vbGVhbiA9IGZhbHNlLCBkcDogbnVtYmVyID0gMikge1xuICBjb25zdCB0aHJlc2g6IG51bWJlciA9IGJpdCA/IDEwMDAgOiAxMDI0O1xuICBpZiAoYnl0ZXMgPD0gMCkge1xuICAgIHJldHVybiAnMCBCJztcbiAgfVxuICBpZiAoTWF0aC5hYnMoYnl0ZXMpIDwgdGhyZXNoKSB7XG4gICAgcmV0dXJuIGJ5dGVzICsgJyBCJztcbiAgfVxuICBjb25zdCB1bml0cyA9IGJpdFxuICAgID8gWydLQicsICdNQicsICdHQicsICdUQicsICdQQicsICdFQicsICdaQicsICdZQiddXG4gICAgOiBbJ0tpQicsICdNaUInLCAnR2lCJywgJ1RpQicsICdQaUInLCAnRWlCJywgJ1ppQicsICdZaUInXTtcbiAgbGV0IHUgPSAtMTtcbiAgY29uc3QgciA9IDEwKipkcDtcbiAgZG8ge1xuICAgIGJ5dGVzIC89IHRocmVzaDtcbiAgICArK3U7XG4gIH0gd2hpbGUgKE1hdGgucm91bmQoTWF0aC5hYnMoYnl0ZXMpICogcikgLyByID49IHRocmVzaCAmJiB1IDwgdW5pdHMubGVuZ3RoIC0gMSk7XG4gIHJldHVybiBgJHtieXRlcy50b0ZpeGVkKGRwKX0gJHt1bml0c1t1XX1gO1xufVxuXG5leHBvcnQgY29uc3QgaXNTdHIgPSAoYXJnOiBhbnkpOiBib29sZWFuID0+IHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xuXG4vLyBleGlzdHMgZGlyZWN0b3J5IG9yIGZpbGVcbmV4cG9ydCBjb25zdCBleGlzdHMgPSBhc3luYyAoZmlsZW5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICB0cnkge1xuICAgIGF3YWl0IERlbm8uc3RhdChmaWxlbmFtZSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTkwODUyL2hvdy1jYW4taS1nZXQtZmlsZS1leHRlbnNpb25zLXdpdGgtamF2YXNjcmlwdFxuZXhwb3J0IGNvbnN0IGZpbGVFeHQgPSAoZm5hbWU6IHN0cmluZyk6IHN0cmluZyA9PiBmbmFtZS5zbGljZSgoZm5hbWUubGFzdEluZGV4T2YoJy4nKSAtIDEgPj4+IDApICsgMik7XG5cbi8vIGV4YW1wbGU6ICcuL2EvYi8nID0+ICdhL2InXG5leHBvcnQgY29uc3QgdHJpbVBhdGggPSAocGF0aDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgLy8gZXhhbXBsZTogJy4vYS9iLycgPT4gJy4vYS9iJ1xuICBpZiAoL1xcLyQvLnRlc3QocGF0aCkpIHBhdGggPSBwYXRoLnNsaWNlKDAsIC0xKTtcbiAgLy8gZXhhbXBsZTogJy4vYS9iJyA9PiAnYS9iJ1xuICBpZiAoL15cXC5cXC8vLnRlc3QocGF0aCkpIHBhdGggPSBwYXRoLnNsaWNlKDIpO1xuICByZXR1cm4gcGF0aDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0NBR0MsR0FFRDs7Ozs7O0NBTUMsR0FDRCxPQUFPLFNBQVMsWUFBWSxLQUFhLEVBQUUsTUFBZSxLQUFLLEVBQUUsS0FBYSxDQUFDLEVBQUU7SUFDL0UsTUFBTSxTQUFpQixNQUFNLE9BQU8sSUFBSTtJQUN4QyxJQUFJLFNBQVMsR0FBRztRQUNkLE9BQU87SUFDVCxDQUFDO0lBQ0QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxTQUFTLFFBQVE7UUFDNUIsT0FBTyxRQUFRO0lBQ2pCLENBQUM7SUFDRCxNQUFNLFFBQVEsTUFDVjtRQUFDO1FBQU07UUFBTTtRQUFNO1FBQU07UUFBTTtRQUFNO1FBQU07S0FBSyxHQUNoRDtRQUFDO1FBQU87UUFBTztRQUFPO1FBQU87UUFBTztRQUFPO1FBQU87S0FBTTtJQUM1RCxJQUFJLElBQUksQ0FBQztJQUNULE1BQU0sSUFBSSxNQUFJO0lBQ2QsR0FBRztRQUNELFNBQVM7UUFDVCxFQUFFO0lBQ0osUUFBUyxLQUFLLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxTQUFTLEtBQUssS0FBSyxVQUFVLElBQUksTUFBTSxNQUFNLEdBQUcsRUFBRztJQUNoRixPQUFPLENBQUMsRUFBRSxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELE9BQU8sTUFBTSxRQUFRLENBQUMsTUFBc0IsT0FBTyxRQUFRLFNBQVM7QUFFcEUsMkJBQTJCO0FBQzNCLE9BQU8sTUFBTSxTQUFTLE9BQU8sV0FBdUM7SUFDbEUsSUFBSTtRQUNGLE1BQU0sS0FBSyxJQUFJLENBQUM7UUFDaEIsT0FBTyxJQUFJO0lBQ2IsRUFBRSxPQUFPLEdBQUc7UUFDVixPQUFPLEtBQUs7SUFDZDtBQUNGLEVBQUM7QUFFRCwyRkFBMkY7QUFDM0YsT0FBTyxNQUFNLFVBQVUsQ0FBQyxRQUEwQixNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU0sV0FBVyxDQUFDLE9BQU8sTUFBTSxDQUFDLElBQUksR0FBRztBQUV0Ryw2QkFBNkI7QUFDN0IsT0FBTyxNQUFNLFdBQVcsQ0FBQyxPQUF5QjtJQUNoRCwrQkFBK0I7SUFDL0IsSUFBSSxNQUFNLElBQUksQ0FBQyxPQUFPLE9BQU8sS0FBSyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzVDLDRCQUE0QjtJQUM1QixJQUFJLFFBQVEsSUFBSSxDQUFDLE9BQU8sT0FBTyxLQUFLLEtBQUssQ0FBQztJQUMxQyxPQUFPO0FBQ1QsRUFBQyJ9