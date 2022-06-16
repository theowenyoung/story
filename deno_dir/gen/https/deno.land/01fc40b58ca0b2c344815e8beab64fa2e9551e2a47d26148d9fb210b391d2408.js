import { runScript } from "./utils/run-script.ts";
import { assert } from "../deps.ts";
export async function runAssert(ctx, step) {
    const { reporter  } = step;
    // check if post
    if (step.assert) {
        // run assert
        try {
            const scriptResult = await runScript(`
        return DENOFLOW_ASSERT(${step.assert});
      `, {
                DENOFLOW_ASSERT: assert,
                ctx: ctx.public
            });
            ctx.public.state = scriptResult.ctx.state;
        } catch (e) {
            reporter.warning(`Failed to run assert script code: ${step.assert}`);
            throw new Error(e);
        }
    }
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvcnVuLWFzc2VydC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGVwT3B0aW9ucyB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgbG9nIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCB7IHJ1blNjcmlwdCB9IGZyb20gXCIuL3V0aWxzL3J1bi1zY3JpcHQudHNcIjtcbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5cbmludGVyZmFjZSBSdW5TdGVwT3B0aW9uIGV4dGVuZHMgU3RlcE9wdGlvbnMge1xuICByZXBvcnRlcjogbG9nLkxvZ2dlcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkFzc2VydChcbiAgY3R4OiBDb250ZXh0LFxuICBzdGVwOiBSdW5TdGVwT3B0aW9uLFxuKTogUHJvbWlzZTxDb250ZXh0PiB7XG4gIGNvbnN0IHsgcmVwb3J0ZXIgfSA9IHN0ZXA7XG4gIC8vIGNoZWNrIGlmIHBvc3RcbiAgaWYgKHN0ZXAuYXNzZXJ0KSB7XG4gICAgLy8gcnVuIGFzc2VydFxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzY3JpcHRSZXN1bHQgPSBhd2FpdCBydW5TY3JpcHQoXG4gICAgICAgIGBcbiAgICAgICAgcmV0dXJuIERFTk9GTE9XX0FTU0VSVCgke3N0ZXAuYXNzZXJ0fSk7XG4gICAgICBgLFxuICAgICAgICB7XG4gICAgICAgICAgREVOT0ZMT1dfQVNTRVJUOiBhc3NlcnQsXG4gICAgICAgICAgY3R4OiBjdHgucHVibGljLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICAgIGN0eC5wdWJsaWMuc3RhdGUgPSBzY3JpcHRSZXN1bHQuY3R4LnN0YXRlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgIGBGYWlsZWQgdG8gcnVuIGFzc2VydCBzY3JpcHQgY29kZTogJHtzdGVwLmFzc2VydH1gLFxuICAgICAgKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGN0eDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxTQUFTLFNBQVMsUUFBUSx1QkFBdUIsQ0FBQztBQUNsRCxTQUFTLE1BQU0sUUFBUSxZQUFZLENBQUM7QUFNcEMsT0FBTyxlQUFlLFNBQVMsQ0FDN0IsR0FBWSxFQUNaLElBQW1CLEVBQ0Q7SUFDbEIsTUFBTSxFQUFFLFFBQVEsQ0FBQSxFQUFFLEdBQUcsSUFBSSxBQUFDO0lBQzFCLGdCQUFnQjtJQUNoQixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDZixhQUFhO1FBQ2IsSUFBSTtZQUNGLE1BQU0sWUFBWSxHQUFHLE1BQU0sU0FBUyxDQUNsQyxDQUFDOytCQUNzQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7TUFDdkMsQ0FBQyxFQUNDO2dCQUNFLGVBQWUsRUFBRSxNQUFNO2dCQUN2QixHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU07YUFDaEIsQ0FDRixBQUFDO1lBQ0YsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7U0FDM0MsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNWLFFBQVEsQ0FBQyxPQUFPLENBQ2QsQ0FBQyxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDbkQsQ0FBQztZQUNGLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDcEI7S0FDRjtJQUNELE9BQU8sR0FBRyxDQUFDO0NBQ1oifQ==