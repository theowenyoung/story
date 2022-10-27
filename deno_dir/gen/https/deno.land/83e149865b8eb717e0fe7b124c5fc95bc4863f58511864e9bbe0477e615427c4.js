// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
import { getLevelByName, LogLevels } from "./levels.ts";
import { blue, bold, red, yellow } from "../fmt/colors.ts";
import { exists, existsSync } from "../fs/exists.ts";
import { BufWriterSync } from "../io/buffer.ts";
const DEFAULT_FORMATTER = "{levelName} {msg}";
export class BaseHandler {
    level;
    levelName;
    formatter;
    constructor(levelName, options = {}){
        this.level = getLevelByName(levelName);
        this.levelName = levelName;
        this.formatter = options.formatter || DEFAULT_FORMATTER;
    }
    handle(logRecord) {
        if (this.level > logRecord.level) return;
        const msg = this.format(logRecord);
        return this.log(msg);
    }
    format(logRecord) {
        if (this.formatter instanceof Function) {
            return this.formatter(logRecord);
        }
        return this.formatter.replace(/{(\S+)}/g, (match, p1)=>{
            const value = logRecord[p1];
            // do not interpolate missing values
            if (value == null) {
                return match;
            }
            return String(value);
        });
    }
    log(_msg) {}
    async setup() {}
    async destroy() {}
}
export class ConsoleHandler extends BaseHandler {
    format(logRecord) {
        let msg = super.format(logRecord);
        switch(logRecord.level){
            case LogLevels.INFO:
                msg = blue(msg);
                break;
            case LogLevels.WARNING:
                msg = yellow(msg);
                break;
            case LogLevels.ERROR:
                msg = red(msg);
                break;
            case LogLevels.CRITICAL:
                msg = bold(red(msg));
                break;
            default:
                break;
        }
        return msg;
    }
    log(msg) {
        console.log(msg);
    }
}
export class WriterHandler extends BaseHandler {
    _writer;
    #encoder = new TextEncoder();
}
export class FileHandler extends WriterHandler {
    _file;
    _buf;
    _filename;
    _mode;
    _openOptions;
    _encoder = new TextEncoder();
    #unloadCallback() {
        this.destroy();
    }
    constructor(levelName, options){
        super(levelName, options);
        this._filename = options.filename;
        // default to append mode, write only
        this._mode = options.mode ? options.mode : "a";
        this._openOptions = {
            createNew: this._mode === "x",
            create: this._mode !== "x",
            append: this._mode === "a",
            truncate: this._mode !== "a",
            write: true
        };
    }
    async setup() {
        this._file = await Deno.open(this._filename, this._openOptions);
        this._writer = this._file;
        this._buf = new BufWriterSync(this._file);
        addEventListener("unload", this.#unloadCallback.bind(this));
    }
    handle(logRecord) {
        super.handle(logRecord);
        // Immediately flush if log level is higher than ERROR
        if (logRecord.level > LogLevels.ERROR) {
            this.flush();
        }
    }
    log(msg) {
        this._buf.writeSync(this._encoder.encode(msg + "\n"));
    }
    flush() {
        if (this._buf?.buffered() > 0) {
            this._buf.flush();
        }
    }
    destroy() {
        this.flush();
        this._file?.close();
        this._file = undefined;
        removeEventListener("unload", this.#unloadCallback);
        return Promise.resolve();
    }
}
export class RotatingFileHandler extends FileHandler {
    #maxBytes;
    #maxBackupCount;
    #currentFileSize = 0;
    constructor(levelName, options){
        super(levelName, options);
        this.#maxBytes = options.maxBytes;
        this.#maxBackupCount = options.maxBackupCount;
    }
    async setup() {
        if (this.#maxBytes < 1) {
            this.destroy();
            throw new Error("maxBytes cannot be less than 1");
        }
        if (this.#maxBackupCount < 1) {
            this.destroy();
            throw new Error("maxBackupCount cannot be less than 1");
        }
        await super.setup();
        if (this._mode === "w") {
            // Remove old backups too as it doesn't make sense to start with a clean
            // log file, but old backups
            for(let i = 1; i <= this.#maxBackupCount; i++){
                if (await exists(this._filename + "." + i)) {
                    await Deno.remove(this._filename + "." + i);
                }
            }
        } else if (this._mode === "x") {
            // Throw if any backups also exist
            for(let i1 = 1; i1 <= this.#maxBackupCount; i1++){
                if (await exists(this._filename + "." + i1)) {
                    this.destroy();
                    throw new Deno.errors.AlreadyExists("Backup log file " + this._filename + "." + i1 + " already exists");
                }
            }
        } else {
            this.#currentFileSize = (await Deno.stat(this._filename)).size;
        }
    }
    log(msg) {
        const msgByteLength = this._encoder.encode(msg).byteLength + 1;
        if (this.#currentFileSize + msgByteLength > this.#maxBytes) {
            this.rotateLogFiles();
            this.#currentFileSize = 0;
        }
        this._buf.writeSync(this._encoder.encode(msg + "\n"));
        this.#currentFileSize += msgByteLength;
    }
    rotateLogFiles() {
        this._buf.flush();
        Deno.close(this._file.rid);
        for(let i = this.#maxBackupCount - 1; i >= 0; i--){
            const source = this._filename + (i === 0 ? "" : "." + i);
            const dest = this._filename + "." + (i + 1);
            if (existsSync(source)) {
                Deno.renameSync(source, dest);
            }
        }
        this._file = Deno.openSync(this._filename, this._openOptions);
        this._writer = this._file;
        this._buf = new BufWriterSync(this._file);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjEyMS4wL2xvZy9oYW5kbGVycy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuaW1wb3J0IHsgZ2V0TGV2ZWxCeU5hbWUsIExldmVsTmFtZSwgTG9nTGV2ZWxzIH0gZnJvbSBcIi4vbGV2ZWxzLnRzXCI7XG5pbXBvcnQgdHlwZSB7IExvZ1JlY29yZCB9IGZyb20gXCIuL2xvZ2dlci50c1wiO1xuaW1wb3J0IHsgYmx1ZSwgYm9sZCwgcmVkLCB5ZWxsb3cgfSBmcm9tIFwiLi4vZm10L2NvbG9ycy50c1wiO1xuaW1wb3J0IHsgZXhpc3RzLCBleGlzdHNTeW5jIH0gZnJvbSBcIi4uL2ZzL2V4aXN0cy50c1wiO1xuaW1wb3J0IHsgQnVmV3JpdGVyU3luYyB9IGZyb20gXCIuLi9pby9idWZmZXIudHNcIjtcblxuY29uc3QgREVGQVVMVF9GT1JNQVRURVIgPSBcIntsZXZlbE5hbWV9IHttc2d9XCI7XG5leHBvcnQgdHlwZSBGb3JtYXR0ZXJGdW5jdGlvbiA9IChsb2dSZWNvcmQ6IExvZ1JlY29yZCkgPT4gc3RyaW5nO1xuZXhwb3J0IHR5cGUgTG9nTW9kZSA9IFwiYVwiIHwgXCJ3XCIgfCBcInhcIjtcblxuZXhwb3J0IGludGVyZmFjZSBIYW5kbGVyT3B0aW9ucyB7XG4gIGZvcm1hdHRlcj86IHN0cmluZyB8IEZvcm1hdHRlckZ1bmN0aW9uO1xufVxuXG5leHBvcnQgY2xhc3MgQmFzZUhhbmRsZXIge1xuICBsZXZlbDogbnVtYmVyO1xuICBsZXZlbE5hbWU6IExldmVsTmFtZTtcbiAgZm9ybWF0dGVyOiBzdHJpbmcgfCBGb3JtYXR0ZXJGdW5jdGlvbjtcblxuICBjb25zdHJ1Y3RvcihsZXZlbE5hbWU6IExldmVsTmFtZSwgb3B0aW9uczogSGFuZGxlck9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubGV2ZWwgPSBnZXRMZXZlbEJ5TmFtZShsZXZlbE5hbWUpO1xuICAgIHRoaXMubGV2ZWxOYW1lID0gbGV2ZWxOYW1lO1xuXG4gICAgdGhpcy5mb3JtYXR0ZXIgPSBvcHRpb25zLmZvcm1hdHRlciB8fCBERUZBVUxUX0ZPUk1BVFRFUjtcbiAgfVxuXG4gIGhhbmRsZShsb2dSZWNvcmQ6IExvZ1JlY29yZCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxldmVsID4gbG9nUmVjb3JkLmxldmVsKSByZXR1cm47XG5cbiAgICBjb25zdCBtc2cgPSB0aGlzLmZvcm1hdChsb2dSZWNvcmQpO1xuICAgIHJldHVybiB0aGlzLmxvZyhtc2cpO1xuICB9XG5cbiAgZm9ybWF0KGxvZ1JlY29yZDogTG9nUmVjb3JkKTogc3RyaW5nIHtcbiAgICBpZiAodGhpcy5mb3JtYXR0ZXIgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0dGVyKGxvZ1JlY29yZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0dGVyLnJlcGxhY2UoL3soXFxTKyl9L2csIChtYXRjaCwgcDEpOiBzdHJpbmcgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBsb2dSZWNvcmRbcDEgYXMga2V5b2YgTG9nUmVjb3JkXTtcblxuICAgICAgLy8gZG8gbm90IGludGVycG9sYXRlIG1pc3NpbmcgdmFsdWVzXG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBTdHJpbmcodmFsdWUpO1xuICAgIH0pO1xuICB9XG5cbiAgbG9nKF9tc2c6IHN0cmluZyk6IHZvaWQge31cbiAgYXN5bmMgc2V0dXAoKSB7fVxuICBhc3luYyBkZXN0cm95KCkge31cbn1cblxuZXhwb3J0IGNsYXNzIENvbnNvbGVIYW5kbGVyIGV4dGVuZHMgQmFzZUhhbmRsZXIge1xuICBmb3JtYXQobG9nUmVjb3JkOiBMb2dSZWNvcmQpOiBzdHJpbmcge1xuICAgIGxldCBtc2cgPSBzdXBlci5mb3JtYXQobG9nUmVjb3JkKTtcblxuICAgIHN3aXRjaCAobG9nUmVjb3JkLmxldmVsKSB7XG4gICAgICBjYXNlIExvZ0xldmVscy5JTkZPOlxuICAgICAgICBtc2cgPSBibHVlKG1zZyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBMb2dMZXZlbHMuV0FSTklORzpcbiAgICAgICAgbXNnID0geWVsbG93KG1zZyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBMb2dMZXZlbHMuRVJST1I6XG4gICAgICAgIG1zZyA9IHJlZChtc2cpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgTG9nTGV2ZWxzLkNSSVRJQ0FMOlxuICAgICAgICBtc2cgPSBib2xkKHJlZChtc2cpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gbXNnO1xuICB9XG5cbiAgbG9nKG1zZzogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2cobXNnKTtcbiAgfVxufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgV3JpdGVySGFuZGxlciBleHRlbmRzIEJhc2VIYW5kbGVyIHtcbiAgcHJvdGVjdGVkIF93cml0ZXIhOiBEZW5vLldyaXRlcjtcbiAgI2VuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcblxuICBhYnN0cmFjdCBsb2cobXNnOiBzdHJpbmcpOiB2b2lkO1xufVxuXG5pbnRlcmZhY2UgRmlsZUhhbmRsZXJPcHRpb25zIGV4dGVuZHMgSGFuZGxlck9wdGlvbnMge1xuICBmaWxlbmFtZTogc3RyaW5nO1xuICBtb2RlPzogTG9nTW9kZTtcbn1cblxuZXhwb3J0IGNsYXNzIEZpbGVIYW5kbGVyIGV4dGVuZHMgV3JpdGVySGFuZGxlciB7XG4gIHByb3RlY3RlZCBfZmlsZTogRGVuby5GaWxlIHwgdW5kZWZpbmVkO1xuICBwcm90ZWN0ZWQgX2J1ZiE6IEJ1ZldyaXRlclN5bmM7XG4gIHByb3RlY3RlZCBfZmlsZW5hbWU6IHN0cmluZztcbiAgcHJvdGVjdGVkIF9tb2RlOiBMb2dNb2RlO1xuICBwcm90ZWN0ZWQgX29wZW5PcHRpb25zOiBEZW5vLk9wZW5PcHRpb25zO1xuICBwcm90ZWN0ZWQgX2VuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgI3VubG9hZENhbGxiYWNrKCkge1xuICAgIHRoaXMuZGVzdHJveSgpO1xuICB9XG5cbiAgY29uc3RydWN0b3IobGV2ZWxOYW1lOiBMZXZlbE5hbWUsIG9wdGlvbnM6IEZpbGVIYW5kbGVyT3B0aW9ucykge1xuICAgIHN1cGVyKGxldmVsTmFtZSwgb3B0aW9ucyk7XG4gICAgdGhpcy5fZmlsZW5hbWUgPSBvcHRpb25zLmZpbGVuYW1lO1xuICAgIC8vIGRlZmF1bHQgdG8gYXBwZW5kIG1vZGUsIHdyaXRlIG9ubHlcbiAgICB0aGlzLl9tb2RlID0gb3B0aW9ucy5tb2RlID8gb3B0aW9ucy5tb2RlIDogXCJhXCI7XG4gICAgdGhpcy5fb3Blbk9wdGlvbnMgPSB7XG4gICAgICBjcmVhdGVOZXc6IHRoaXMuX21vZGUgPT09IFwieFwiLFxuICAgICAgY3JlYXRlOiB0aGlzLl9tb2RlICE9PSBcInhcIixcbiAgICAgIGFwcGVuZDogdGhpcy5fbW9kZSA9PT0gXCJhXCIsXG4gICAgICB0cnVuY2F0ZTogdGhpcy5fbW9kZSAhPT0gXCJhXCIsXG4gICAgICB3cml0ZTogdHJ1ZSxcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgc2V0dXAoKSB7XG4gICAgdGhpcy5fZmlsZSA9IGF3YWl0IERlbm8ub3Blbih0aGlzLl9maWxlbmFtZSwgdGhpcy5fb3Blbk9wdGlvbnMpO1xuICAgIHRoaXMuX3dyaXRlciA9IHRoaXMuX2ZpbGU7XG4gICAgdGhpcy5fYnVmID0gbmV3IEJ1ZldyaXRlclN5bmModGhpcy5fZmlsZSk7XG5cbiAgICBhZGRFdmVudExpc3RlbmVyKFwidW5sb2FkXCIsIHRoaXMuI3VubG9hZENhbGxiYWNrLmJpbmQodGhpcykpO1xuICB9XG5cbiAgaGFuZGxlKGxvZ1JlY29yZDogTG9nUmVjb3JkKTogdm9pZCB7XG4gICAgc3VwZXIuaGFuZGxlKGxvZ1JlY29yZCk7XG5cbiAgICAvLyBJbW1lZGlhdGVseSBmbHVzaCBpZiBsb2cgbGV2ZWwgaXMgaGlnaGVyIHRoYW4gRVJST1JcbiAgICBpZiAobG9nUmVjb3JkLmxldmVsID4gTG9nTGV2ZWxzLkVSUk9SKSB7XG4gICAgICB0aGlzLmZsdXNoKCk7XG4gICAgfVxuICB9XG5cbiAgbG9nKG1zZzogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5fYnVmLndyaXRlU3luYyh0aGlzLl9lbmNvZGVyLmVuY29kZShtc2cgKyBcIlxcblwiKSk7XG4gIH1cblxuICBmbHVzaCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fYnVmPy5idWZmZXJlZCgpID4gMCkge1xuICAgICAgdGhpcy5fYnVmLmZsdXNoKCk7XG4gICAgfVxuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmZsdXNoKCk7XG4gICAgdGhpcy5fZmlsZT8uY2xvc2UoKTtcbiAgICB0aGlzLl9maWxlID0gdW5kZWZpbmVkO1xuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ1bmxvYWRcIiwgdGhpcy4jdW5sb2FkQ2FsbGJhY2spO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgUm90YXRpbmdGaWxlSGFuZGxlck9wdGlvbnMgZXh0ZW5kcyBGaWxlSGFuZGxlck9wdGlvbnMge1xuICBtYXhCeXRlczogbnVtYmVyO1xuICBtYXhCYWNrdXBDb3VudDogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgUm90YXRpbmdGaWxlSGFuZGxlciBleHRlbmRzIEZpbGVIYW5kbGVyIHtcbiAgI21heEJ5dGVzOiBudW1iZXI7XG4gICNtYXhCYWNrdXBDb3VudDogbnVtYmVyO1xuICAjY3VycmVudEZpbGVTaXplID0gMDtcblxuICBjb25zdHJ1Y3RvcihsZXZlbE5hbWU6IExldmVsTmFtZSwgb3B0aW9uczogUm90YXRpbmdGaWxlSGFuZGxlck9wdGlvbnMpIHtcbiAgICBzdXBlcihsZXZlbE5hbWUsIG9wdGlvbnMpO1xuICAgIHRoaXMuI21heEJ5dGVzID0gb3B0aW9ucy5tYXhCeXRlcztcbiAgICB0aGlzLiNtYXhCYWNrdXBDb3VudCA9IG9wdGlvbnMubWF4QmFja3VwQ291bnQ7XG4gIH1cblxuICBhc3luYyBzZXR1cCgpIHtcbiAgICBpZiAodGhpcy4jbWF4Qnl0ZXMgPCAxKSB7XG4gICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm1heEJ5dGVzIGNhbm5vdCBiZSBsZXNzIHRoYW4gMVwiKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuI21heEJhY2t1cENvdW50IDwgMSkge1xuICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJtYXhCYWNrdXBDb3VudCBjYW5ub3QgYmUgbGVzcyB0aGFuIDFcIik7XG4gICAgfVxuICAgIGF3YWl0IHN1cGVyLnNldHVwKCk7XG5cbiAgICBpZiAodGhpcy5fbW9kZSA9PT0gXCJ3XCIpIHtcbiAgICAgIC8vIFJlbW92ZSBvbGQgYmFja3VwcyB0b28gYXMgaXQgZG9lc24ndCBtYWtlIHNlbnNlIHRvIHN0YXJ0IHdpdGggYSBjbGVhblxuICAgICAgLy8gbG9nIGZpbGUsIGJ1dCBvbGQgYmFja3Vwc1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gdGhpcy4jbWF4QmFja3VwQ291bnQ7IGkrKykge1xuICAgICAgICBpZiAoYXdhaXQgZXhpc3RzKHRoaXMuX2ZpbGVuYW1lICsgXCIuXCIgKyBpKSkge1xuICAgICAgICAgIGF3YWl0IERlbm8ucmVtb3ZlKHRoaXMuX2ZpbGVuYW1lICsgXCIuXCIgKyBpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5fbW9kZSA9PT0gXCJ4XCIpIHtcbiAgICAgIC8vIFRocm93IGlmIGFueSBiYWNrdXBzIGFsc28gZXhpc3RcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IHRoaXMuI21heEJhY2t1cENvdW50OyBpKyspIHtcbiAgICAgICAgaWYgKGF3YWl0IGV4aXN0cyh0aGlzLl9maWxlbmFtZSArIFwiLlwiICsgaSkpIHtcbiAgICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRGVuby5lcnJvcnMuQWxyZWFkeUV4aXN0cyhcbiAgICAgICAgICAgIFwiQmFja3VwIGxvZyBmaWxlIFwiICsgdGhpcy5fZmlsZW5hbWUgKyBcIi5cIiArIGkgKyBcIiBhbHJlYWR5IGV4aXN0c1wiLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4jY3VycmVudEZpbGVTaXplID0gKGF3YWl0IERlbm8uc3RhdCh0aGlzLl9maWxlbmFtZSkpLnNpemU7XG4gICAgfVxuICB9XG5cbiAgbG9nKG1zZzogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgbXNnQnl0ZUxlbmd0aCA9IHRoaXMuX2VuY29kZXIuZW5jb2RlKG1zZykuYnl0ZUxlbmd0aCArIDE7XG5cbiAgICBpZiAodGhpcy4jY3VycmVudEZpbGVTaXplICsgbXNnQnl0ZUxlbmd0aCA+IHRoaXMuI21heEJ5dGVzKSB7XG4gICAgICB0aGlzLnJvdGF0ZUxvZ0ZpbGVzKCk7XG4gICAgICB0aGlzLiNjdXJyZW50RmlsZVNpemUgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuX2J1Zi53cml0ZVN5bmModGhpcy5fZW5jb2Rlci5lbmNvZGUobXNnICsgXCJcXG5cIikpO1xuICAgIHRoaXMuI2N1cnJlbnRGaWxlU2l6ZSArPSBtc2dCeXRlTGVuZ3RoO1xuICB9XG5cbiAgcm90YXRlTG9nRmlsZXMoKTogdm9pZCB7XG4gICAgdGhpcy5fYnVmLmZsdXNoKCk7XG4gICAgRGVuby5jbG9zZSh0aGlzLl9maWxlIS5yaWQpO1xuXG4gICAgZm9yIChsZXQgaSA9IHRoaXMuI21heEJhY2t1cENvdW50IC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuX2ZpbGVuYW1lICsgKGkgPT09IDAgPyBcIlwiIDogXCIuXCIgKyBpKTtcbiAgICAgIGNvbnN0IGRlc3QgPSB0aGlzLl9maWxlbmFtZSArIFwiLlwiICsgKGkgKyAxKTtcblxuICAgICAgaWYgKGV4aXN0c1N5bmMoc291cmNlKSkge1xuICAgICAgICBEZW5vLnJlbmFtZVN5bmMoc291cmNlLCBkZXN0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9maWxlID0gRGVuby5vcGVuU3luYyh0aGlzLl9maWxlbmFtZSwgdGhpcy5fb3Blbk9wdGlvbnMpO1xuICAgIHRoaXMuX3dyaXRlciA9IHRoaXMuX2ZpbGU7XG4gICAgdGhpcy5fYnVmID0gbmV3IEJ1ZldyaXRlclN5bmModGhpcy5fZmlsZSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsU0FBUyxjQUFjLEVBQWEsU0FBUyxRQUFRLGNBQWM7QUFFbkUsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLFFBQVEsbUJBQW1CO0FBQzNELFNBQVMsTUFBTSxFQUFFLFVBQVUsUUFBUSxrQkFBa0I7QUFDckQsU0FBUyxhQUFhLFFBQVEsa0JBQWtCO0FBRWhELE1BQU0sb0JBQW9CO0FBUTFCLE9BQU8sTUFBTTtJQUNYLE1BQWM7SUFDZCxVQUFxQjtJQUNyQixVQUFzQztJQUV0QyxZQUFZLFNBQW9CLEVBQUUsVUFBMEIsQ0FBQyxDQUFDLENBQUU7UUFDOUQsSUFBSSxDQUFDLEtBQUssR0FBRyxlQUFlO1FBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUc7UUFFakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLFNBQVMsSUFBSTtJQUN4QztJQUVBLE9BQU8sU0FBb0IsRUFBUTtRQUNqQyxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsVUFBVSxLQUFLLEVBQUU7UUFFbEMsTUFBTSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDeEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO0lB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