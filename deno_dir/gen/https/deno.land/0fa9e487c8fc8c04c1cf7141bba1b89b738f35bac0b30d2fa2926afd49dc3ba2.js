import { bold, gray, green, log, red, yellow } from "../deps.ts";
export class ReportHandler extends log.handlers.BaseHandler {
    format(logRecord) {
        const msg = super.format(logRecord);
        return msg;
    }
    log(msg) {
        console.log(msg);
    }
}
await log.setup({
    handlers: {
        default: new ReportHandler("INFO", {
            formatter: msgFormatter
        })
    },
    loggers: {
        // configure default logger available via short-hand methods above.
        default: {
            handlers: [
                "default"
            ],
            level: "INFO"
        }
    }
});
export function getReporter(name, debug) {
    const reporter = log.getLogger(name);
    reporter.level = debug ? log.LogLevels.DEBUG : log.LogLevels.INFO;
    reporter.handlers = [
        new ReportHandler("DEBUG", {
            formatter: msgFormatter
        })
    ];
    return reporter;
}
export default log.getLogger();
function msgFormatter(logRecord) {
    const { loggerName , msg , level  } = logRecord;
    let finalMsg = "";
    let loggerNameFormated = `[${loggerName}]`;
    if (loggerName === "default") {
        loggerNameFormated = "";
    }
    if (loggerNameFormated) {
        loggerNameFormated = gray(loggerNameFormated);
    }
    if (logRecord.args.length > 0 && typeof logRecord.args[0] === "string") {
        finalMsg += `${formatMsgColor(level, logRecord.args[0])} `;
        finalMsg += `${msg} ${loggerNameFormated}`;
    } else {
        finalMsg += `${msg} ${loggerNameFormated}`;
        logRecord.args.forEach((arg, index)=>{
            finalMsg += `, arg${index}: ${arg}`;
        });
        finalMsg = formatMsgColor(level, finalMsg);
    }
    return finalMsg;
}
export function formatMsgColor(level, msg) {
    switch(level){
        case log.LogLevels.DEBUG:
            msg = green(msg);
            break;
        case log.LogLevels.INFO:
            msg = green(msg);
            break;
        case log.LogLevels.WARNING:
            msg = yellow(msg);
            break;
        case log.LogLevels.ERROR:
            msg = red(msg);
            break;
        case log.LogLevels.CRITICAL:
            msg = bold(red(msg));
            break;
        default:
            break;
    }
    return msg;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvcmVwb3J0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGJvbGQsIGdyYXksIGdyZWVuLCBsb2csIHJlZCwgeWVsbG93IH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmV4cG9ydCBjbGFzcyBSZXBvcnRIYW5kbGVyIGV4dGVuZHMgbG9nLmhhbmRsZXJzLkJhc2VIYW5kbGVyIHtcbiAgZm9ybWF0KGxvZ1JlY29yZDogbG9nLkxvZ1JlY29yZCk6IHN0cmluZyB7XG4gICAgY29uc3QgbXNnID0gc3VwZXIuZm9ybWF0KGxvZ1JlY29yZCk7XG4gICAgcmV0dXJuIG1zZztcbiAgfVxuXG4gIGxvZyhtc2c6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKG1zZyk7XG4gIH1cbn1cbmF3YWl0IGxvZy5zZXR1cCh7XG4gIGhhbmRsZXJzOiB7XG4gICAgZGVmYXVsdDogbmV3IFJlcG9ydEhhbmRsZXIoXCJJTkZPXCIsIHtcbiAgICAgIGZvcm1hdHRlcjogbXNnRm9ybWF0dGVyLFxuICAgIH0pLFxuICB9LFxuXG4gIGxvZ2dlcnM6IHtcbiAgICAvLyBjb25maWd1cmUgZGVmYXVsdCBsb2dnZXIgYXZhaWxhYmxlIHZpYSBzaG9ydC1oYW5kIG1ldGhvZHMgYWJvdmUuXG4gICAgZGVmYXVsdDoge1xuICAgICAgaGFuZGxlcnM6IFtcImRlZmF1bHRcIl0sXG4gICAgICBsZXZlbDogXCJJTkZPXCIsXG4gICAgfSxcbiAgfSxcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwb3J0ZXIoXG4gIG5hbWU6IHN0cmluZyxcbiAgZGVidWc6IGJvb2xlYW4sXG4pOiBsb2cuTG9nZ2VyIHtcbiAgY29uc3QgcmVwb3J0ZXIgPSBsb2cuZ2V0TG9nZ2VyKG5hbWUpO1xuXG4gIHJlcG9ydGVyLmxldmVsID0gZGVidWcgPyBsb2cuTG9nTGV2ZWxzLkRFQlVHIDogbG9nLkxvZ0xldmVscy5JTkZPO1xuICByZXBvcnRlci5oYW5kbGVycyA9IFtcbiAgICBuZXcgUmVwb3J0SGFuZGxlcihcIkRFQlVHXCIsIHtcbiAgICAgIGZvcm1hdHRlcjogbXNnRm9ybWF0dGVyLFxuICAgIH0pLFxuICBdO1xuICByZXR1cm4gcmVwb3J0ZXI7XG59XG5leHBvcnQgZGVmYXVsdCBsb2cuZ2V0TG9nZ2VyKCk7XG5mdW5jdGlvbiBtc2dGb3JtYXR0ZXIobG9nUmVjb3JkOiBsb2cuTG9nUmVjb3JkKTogc3RyaW5nIHtcbiAgY29uc3Qge1xuICAgIGxvZ2dlck5hbWUsXG4gICAgbXNnLFxuICAgIGxldmVsLFxuICB9ID0gbG9nUmVjb3JkO1xuICBsZXQgZmluYWxNc2cgPSBcIlwiO1xuICBsZXQgbG9nZ2VyTmFtZUZvcm1hdGVkID0gYFske2xvZ2dlck5hbWV9XWA7XG5cbiAgaWYgKGxvZ2dlck5hbWUgPT09IFwiZGVmYXVsdFwiKSB7XG4gICAgbG9nZ2VyTmFtZUZvcm1hdGVkID0gXCJcIjtcbiAgfVxuICBpZiAobG9nZ2VyTmFtZUZvcm1hdGVkKSB7XG4gICAgbG9nZ2VyTmFtZUZvcm1hdGVkID0gZ3JheShsb2dnZXJOYW1lRm9ybWF0ZWQpO1xuICB9XG4gIGlmIChcbiAgICBsb2dSZWNvcmQuYXJncy5sZW5ndGggPiAwICYmIHR5cGVvZiBsb2dSZWNvcmQuYXJnc1swXSA9PT0gXCJzdHJpbmdcIlxuICApIHtcbiAgICBmaW5hbE1zZyArPSBgJHtmb3JtYXRNc2dDb2xvcihsZXZlbCwgbG9nUmVjb3JkLmFyZ3NbMF0pfSBgO1xuXG4gICAgZmluYWxNc2cgKz0gYCR7bXNnfSAke2xvZ2dlck5hbWVGb3JtYXRlZH1gO1xuICB9IGVsc2Uge1xuICAgIGZpbmFsTXNnICs9IGAke21zZ30gJHtsb2dnZXJOYW1lRm9ybWF0ZWR9YDtcbiAgICBsb2dSZWNvcmQuYXJncy5mb3JFYWNoKChhcmcsIGluZGV4KSA9PiB7XG4gICAgICBmaW5hbE1zZyArPSBgLCBhcmcke2luZGV4fTogJHthcmd9YDtcbiAgICB9KTtcbiAgICBmaW5hbE1zZyA9IGZvcm1hdE1zZ0NvbG9yKGxldmVsLCBmaW5hbE1zZyk7XG4gIH1cblxuICByZXR1cm4gZmluYWxNc2c7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRNc2dDb2xvcihsZXZlbDogbG9nLkxvZ0xldmVscywgbXNnOiBzdHJpbmcpOiBzdHJpbmcge1xuICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgY2FzZSBsb2cuTG9nTGV2ZWxzLkRFQlVHOlxuICAgICAgbXNnID0gZ3JlZW4obXNnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgbG9nLkxvZ0xldmVscy5JTkZPOlxuICAgICAgbXNnID0gZ3JlZW4obXNnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgbG9nLkxvZ0xldmVscy5XQVJOSU5HOlxuICAgICAgbXNnID0geWVsbG93KG1zZyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIGxvZy5Mb2dMZXZlbHMuRVJST1I6XG4gICAgICBtc2cgPSByZWQobXNnKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgbG9nLkxvZ0xldmVscy5DUklUSUNBTDpcbiAgICAgIG1zZyA9IGJvbGQocmVkKG1zZykpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiBtc2c7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sUUFBUSxhQUFhO0FBQ2pFLE9BQU8sTUFBTSxzQkFBc0IsSUFBSSxRQUFRLENBQUMsV0FBVztJQUN6RCxPQUFPLFNBQXdCLEVBQVU7UUFDdkMsTUFBTSxNQUFNLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDekIsT0FBTztJQUNUO0lBRUEsSUFBSSxHQUFXLEVBQVE7UUFDckIsUUFBUSxHQUFHLENBQUM7SUFDZDtBQUNGLENBQUM7QUFDRCxNQUFNLElBQUksS0FBSyxDQUFDO0lBQ2QsVUFBVTtRQUNSLFNBQVMsSUFBSSxjQUFjLFFBQVE7WUFDakMsV0FBVztRQUNiO0lBQ0Y7SUFFQSxTQUFTO1FBQ1AsbUVBQW1FO1FBQ25FLFNBQVM7WUFDUCxVQUFVO2dCQUFDO2FBQVU7WUFDckIsT0FBTztRQUNUO0lBQ0Y7QUFDRjtBQUVBLE9BQU8sU0FBUyxZQUNkLElBQVksRUFDWixLQUFjLEVBQ0Y7SUFDWixNQUFNLFdBQVcsSUFBSSxTQUFTLENBQUM7SUFFL0IsU0FBUyxLQUFLLEdBQUcsUUFBUSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSTtJQUNqRSxTQUFTLFFBQVEsR0FBRztRQUNsQixJQUFJLGNBQWMsU0FBUztZQUN6QixXQUFXO1FBQ2I7S0FDRDtJQUNELE9BQU87QUFDVCxDQUFDO0FBQ0QsZUFBZSxJQUFJLFNBQVMsR0FBRztBQUMvQixTQUFTLGFBQWEsU0FBd0IsRUFBVTtJQUN0RCxNQUFNLEVBQ0osV0FBVSxFQUNWLElBQUcsRUFDSCxNQUFLLEVBQ04sR0FBRztJQUNKLElBQUksV0FBVztJQUNmLElBQUkscUJBQXFCLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRTFDLElBQUksZUFBZSxXQUFXO1FBQzVCLHFCQUFxQjtJQUN2QixDQUFDO0lBQ0QsSUFBSSxvQkFBb0I7UUFDdEIscUJBQXFCLEtBQUs7SUFDNUIsQ0FBQztJQUNELElBQ0UsVUFBVSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssT0FBTyxVQUFVLElBQUksQ0FBQyxFQUFFLEtBQUssVUFDMUQ7UUFDQSxZQUFZLENBQUMsRUFBRSxlQUFlLE9BQU8sVUFBVSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUxRCxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxtQkFBbUIsQ0FBQztJQUM1QyxPQUFPO1FBQ0wsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsbUJBQW1CLENBQUM7UUFDMUMsVUFBVSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxRQUFVO1lBQ3JDLFlBQVksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDO1FBQ3JDO1FBQ0EsV0FBVyxlQUFlLE9BQU87SUFDbkMsQ0FBQztJQUVELE9BQU87QUFDVDtBQUVBLE9BQU8sU0FBUyxlQUFlLEtBQW9CLEVBQUUsR0FBVyxFQUFVO0lBQ3hFLE9BQVE7UUFDTixLQUFLLElBQUksU0FBUyxDQUFDLEtBQUs7WUFDdEIsTUFBTSxNQUFNO1lBQ1osS0FBTTtRQUNSLEtBQUssSUFBSSxTQUFTLENBQUMsSUFBSTtZQUNyQixNQUFNLE1BQU07WUFDWixLQUFNO1FBQ1IsS0FBSyxJQUFJLFNBQVMsQ0FBQyxPQUFPO1lBQ3hCLE1BQU0sT0FBTztZQUNiLEtBQU07UUFDUixLQUFLLElBQUksU0FBUyxDQUFDLEtBQUs7WUFDdEIsTUFBTSxJQUFJO1lBQ1YsS0FBTTtRQUNSLEtBQUssSUFBSSxTQUFTLENBQUMsUUFBUTtZQUN6QixNQUFNLEtBQUssSUFBSTtZQUNmLEtBQU07UUFDUjtZQUNFLEtBQU07SUFDVjtJQUNBLE9BQU87QUFDVCxDQUFDIn0=