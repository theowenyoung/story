import { red, bold, yellow, blue, green, gray, rgb24, stripColor } from 'https://deno.land/std@0.85.0/fmt/colors.ts';
import { join } from 'https://deno.land/std@0.85.0/path/mod.ts';
import { getDateFormat } from './lib/get-date-format.ts';
import { existsSync } from 'https://deno.land/std@0.85.0/fs/exists.ts';
export const consoleLogger = (message, level)=>{
    const encoder = new TextEncoder();
    if (level === 'error') Deno.stderr.writeSync(encoder.encode(message));
    else Deno.stdout.writeSync(encoder.encode(message));
};
export const makeFileLogger = (folder = '.log', options = {})=>(message, level)=>{
        const date = new Date();
        const prettyDate = getDateFormat(date, options.newLogFileEach || 'day');
        const path = `${level} ${prettyDate}.txt`;
        if (!existsSync(folder)) Deno.mkdirSync(folder, {
            recursive: true
        });
        Deno.writeTextFileSync(join(folder, path), `${options.prependTime ? `[${getDateFormat(date, 'log')}] ` : ''}${stripColor(message)}`, {
            append: true
        });
    };
export const defaultStringify = (message)=>{
    return message.map((message)=>{
        if (typeof message === 'string') return message;
        else return Deno.inspect(message, {
            depth: 100
        });
    }).join(' ') + '\n';
};
export const defaultScopes = [
    {
        name: 'default-error',
        level: 'error',
        prepend: `${bold(red('error'))}:`,
        storeLogs: true
    },
    {
        name: 'default-warn',
        level: 'warn',
        prepend: `${bold(yellow('warn'))}:`,
        storeLogs: true
    },
    {
        name: 'default-notice',
        level: 'notice',
        prepend: `${bold(blue('notice'))}:`,
        storeLogs: true
    },
    {
        name: 'default-info',
        level: 'info',
        prepend: `${bold(green('info'))}:`,
        storeLogs: true
    },
    {
        name: 'default-debug',
        level: 'debug',
        prepend: `${bold(gray('debug'))}:`,
        storeLogs: true
    },
    {
        name: 'default-stack',
        level: 'debug',
        messageMap () {
            const stack = new Error().stack;
            if (!stack) throw new Error(`Could not get call stack`);
            const stackColor = (str)=>rgb24(str, {
                    r: 17,
                    g: 168,
                    b: 201
                });
            const importantStack = stack.split('\n').slice(5).map((str)=>str.replace(/^\s*at/, gray('from')).replace(/([\w\-\.]+):(\d+):(\d+)/, `${stackColor('$1')}:${yellow('$2')}:${yellow('$3')}`)).map((str, index)=>{
                if (index === 0) return `${bold(stackColor('stack'))} ${str}`;
                else return `      ${str}`;
            });
            return [
                importantStack.join('\n')
            ];
        },
        storeLogs: true
    }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvaGFja2xlQDEuMS4xL3Rvb2xzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgTG9nZ2VyLCBTY29wZSB9IGZyb20gJy4vbW9kLnRzJ1xuaW1wb3J0IHsgcmVkLCBib2xkLCB5ZWxsb3csIGJsdWUsIGdyZWVuLCBncmF5LCByZ2IyNCwgc3RyaXBDb2xvciB9IGZyb20gJ2h0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjg1LjAvZm10L2NvbG9ycy50cydcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdodHRwczovL2Rlbm8ubGFuZC9zdGRAMC44NS4wL3BhdGgvbW9kLnRzJ1xuaW1wb3J0IHsgZ2V0RGF0ZUZvcm1hdCB9IGZyb20gJy4vbGliL2dldC1kYXRlLWZvcm1hdC50cydcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdodHRwczovL2Rlbm8ubGFuZC9zdGRAMC44NS4wL2ZzL2V4aXN0cy50cydcblxuZXhwb3J0IGNvbnN0IGNvbnNvbGVMb2dnZXI6IExvZ2dlciA9IChtZXNzYWdlLCBsZXZlbCkgPT4ge1xuXHRjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKClcblxuXHRpZiAobGV2ZWwgPT09ICdlcnJvcicpIERlbm8uc3RkZXJyLndyaXRlU3luYyhlbmNvZGVyLmVuY29kZShtZXNzYWdlKSlcblx0ZWxzZSBEZW5vLnN0ZG91dC53cml0ZVN5bmMoZW5jb2Rlci5lbmNvZGUobWVzc2FnZSkpXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWFrZUZpbGVMb2dnZXJPcHRpb25zIHtcblx0LyoqXG5cdCAqIElmIGEgdGltZSBzaG91bGQgYmUgcHJlcGVuZGVkIG9udG8gZWFjaCBsb2dcblx0ICogQGRlZmF1bHQgdHJ1ZVxuXHQgKi9cblx0cHJlcGVuZFRpbWU/OiBib29sZWFuXG5cblx0LyoqXG5cdCAqIFdoZW4gYSBuZXcgbG9nIGZpbGUgc2hvdWxkIGJlIGNyZWF0ZWRcblx0ICogQGRlZmF1bHQgJ2RheSdcblx0ICovXG5cdG5ld0xvZ0ZpbGVFYWNoPzogJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgJ2hvdXInIHwgJ21pbnV0ZScgfCAnc2Vjb25kJyB8ICdsb2cnXG59XG5cbmV4cG9ydCBjb25zdCBtYWtlRmlsZUxvZ2dlciA9IChmb2xkZXI6IHN0cmluZyA9ICcubG9nJywgb3B0aW9uczogTWFrZUZpbGVMb2dnZXJPcHRpb25zID0ge30pOiBMb2dnZXIgPT4gKG1lc3NhZ2UsIGxldmVsKSA9PiB7XG5cdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpXG5cdGNvbnN0IHByZXR0eURhdGUgPSBnZXREYXRlRm9ybWF0KGRhdGUsIG9wdGlvbnMubmV3TG9nRmlsZUVhY2ggfHwgJ2RheScpXG5cdGNvbnN0IHBhdGggPSBgJHtsZXZlbH0gJHtwcmV0dHlEYXRlfS50eHRgXG5cblx0aWYgKCFleGlzdHNTeW5jKGZvbGRlcikpIERlbm8ubWtkaXJTeW5jKGZvbGRlciwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuXHREZW5vLndyaXRlVGV4dEZpbGVTeW5jKGpvaW4oZm9sZGVyLCBwYXRoKSwgYCR7b3B0aW9ucy5wcmVwZW5kVGltZSA/IGBbJHtnZXREYXRlRm9ybWF0KGRhdGUsICdsb2cnKX1dIGAgOiAnJ30ke3N0cmlwQ29sb3IobWVzc2FnZSl9YCwge1xuXHRcdGFwcGVuZDogdHJ1ZSxcblx0fSlcbn1cblxuZXhwb3J0IGNvbnN0IGRlZmF1bHRTdHJpbmdpZnkgPSAobWVzc2FnZTogYW55W10pOiBzdHJpbmcgPT4ge1xuXHRyZXR1cm4gKFxuXHRcdG1lc3NhZ2Vcblx0XHRcdC5tYXAobWVzc2FnZSA9PiB7XG5cdFx0XHRcdGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycpIHJldHVybiBtZXNzYWdlXG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXR1cm4gRGVuby5pbnNwZWN0KG1lc3NhZ2UsIHtcblx0XHRcdFx0XHRcdGRlcHRoOiAxMDAsXG5cdFx0XHRcdFx0fSlcblx0XHRcdH0pXG5cdFx0XHQuam9pbignICcpICsgJ1xcbidcblx0KVxufVxuXG5leHBvcnQgY29uc3QgZGVmYXVsdFNjb3BlczogU2NvcGVbXSA9IFtcblx0e1xuXHRcdG5hbWU6ICdkZWZhdWx0LWVycm9yJyxcblx0XHRsZXZlbDogJ2Vycm9yJyxcblx0XHRwcmVwZW5kOiBgJHtib2xkKHJlZCgnZXJyb3InKSl9OmAsXG5cdFx0c3RvcmVMb2dzOiB0cnVlLFxuXHR9LFxuXHR7XG5cdFx0bmFtZTogJ2RlZmF1bHQtd2FybicsXG5cdFx0bGV2ZWw6ICd3YXJuJyxcblx0XHRwcmVwZW5kOiBgJHtib2xkKHllbGxvdygnd2FybicpKX06YCxcblx0XHRzdG9yZUxvZ3M6IHRydWUsXG5cdH0sXG5cdHtcblx0XHRuYW1lOiAnZGVmYXVsdC1ub3RpY2UnLFxuXHRcdGxldmVsOiAnbm90aWNlJyxcblx0XHRwcmVwZW5kOiBgJHtib2xkKGJsdWUoJ25vdGljZScpKX06YCxcblx0XHRzdG9yZUxvZ3M6IHRydWUsXG5cdH0sXG5cdHtcblx0XHRuYW1lOiAnZGVmYXVsdC1pbmZvJyxcblx0XHRsZXZlbDogJ2luZm8nLFxuXHRcdHByZXBlbmQ6IGAke2JvbGQoZ3JlZW4oJ2luZm8nKSl9OmAsXG5cdFx0c3RvcmVMb2dzOiB0cnVlLFxuXHR9LFxuXHR7XG5cdFx0bmFtZTogJ2RlZmF1bHQtZGVidWcnLFxuXHRcdGxldmVsOiAnZGVidWcnLFxuXHRcdHByZXBlbmQ6IGAke2JvbGQoZ3JheSgnZGVidWcnKSl9OmAsXG5cdFx0c3RvcmVMb2dzOiB0cnVlLFxuXHR9LFxuXHR7XG5cdFx0bmFtZTogJ2RlZmF1bHQtc3RhY2snLFxuXHRcdGxldmVsOiAnZGVidWcnLFxuXHRcdG1lc3NhZ2VNYXAoKSB7XG5cdFx0XHRjb25zdCBzdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrXG5cdFx0XHRpZiAoIXN0YWNrKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBnZXQgY2FsbCBzdGFja2ApXG5cblx0XHRcdGNvbnN0IHN0YWNrQ29sb3IgPSAoc3RyOiBzdHJpbmcpID0+IHJnYjI0KHN0ciwgeyByOiAxNywgZzogMTY4LCBiOiAyMDEgfSlcblxuXHRcdFx0Y29uc3QgaW1wb3J0YW50U3RhY2sgPSBzdGFja1xuXHRcdFx0XHQuc3BsaXQoJ1xcbicpXG5cdFx0XHRcdC5zbGljZSg1KVxuXHRcdFx0XHQubWFwKHN0ciA9PlxuXHRcdFx0XHRcdHN0clxuXHRcdFx0XHRcdFx0LnJlcGxhY2UoL15cXHMqYXQvLCBncmF5KCdmcm9tJykpXG5cdFx0XHRcdFx0XHQucmVwbGFjZSgvKFtcXHdcXC1cXC5dKyk6KFxcZCspOihcXGQrKS8sIGAke3N0YWNrQ29sb3IoJyQxJyl9OiR7eWVsbG93KCckMicpfToke3llbGxvdygnJDMnKX1gKVxuXHRcdFx0XHQpXG5cdFx0XHRcdC5tYXAoKHN0ciwgaW5kZXgpID0+IHtcblx0XHRcdFx0XHRpZiAoaW5kZXggPT09IDApIHJldHVybiBgJHtib2xkKHN0YWNrQ29sb3IoJ3N0YWNrJykpfSAke3N0cn1gXG5cdFx0XHRcdFx0ZWxzZSByZXR1cm4gYCAgICAgICR7c3RyfWBcblx0XHRcdFx0fSlcblxuXHRcdFx0cmV0dXJuIFtpbXBvcnRhbnRTdGFjay5qb2luKCdcXG4nKV1cblx0XHR9LFxuXHRcdHN0b3JlTG9nczogdHJ1ZSxcblx0fSxcbl1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxTQUFTLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLFFBQVEsNkNBQTRDO0FBQ3BILFNBQVMsSUFBSSxRQUFRLDJDQUEwQztBQUMvRCxTQUFTLGFBQWEsUUFBUSwyQkFBMEI7QUFDeEQsU0FBUyxVQUFVLFFBQVEsNENBQTJDO0FBRXRFLE9BQU8sTUFBTSxnQkFBd0IsQ0FBQyxTQUFTLFFBQVU7SUFDeEQsTUFBTSxVQUFVLElBQUk7SUFFcEIsSUFBSSxVQUFVLFNBQVMsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsTUFBTSxDQUFDO1NBQ3ZE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