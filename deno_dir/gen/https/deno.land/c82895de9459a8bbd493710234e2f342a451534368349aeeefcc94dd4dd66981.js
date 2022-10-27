import { runScript } from "./utils/run-script.ts";
export async function runPost(ctx, step) {
    const { reporter  } = step;
    // check if post
    if (step.post) {
        // run post
        try {
            const scriptResult = await runScript(step.post, {
                ctx: ctx.public
            });
            ctx.public.state = scriptResult.ctx.state;
        } catch (e) {
            reporter.warning(`Failed to run post script code`);
            throw new Error(e);
        }
    }
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvcnVuLXBvc3QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RlcE9wdGlvbnMgfSBmcm9tIFwiLi9pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tIFwiLi9pbnRlcm5hbC1pbnRlcmZhY2UudHNcIjtcbmltcG9ydCB7IGxvZyB9IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBydW5TY3JpcHQgfSBmcm9tIFwiLi91dGlscy9ydW4tc2NyaXB0LnRzXCI7XG5cbmludGVyZmFjZSBSdW5TdGVwT3B0aW9uIGV4dGVuZHMgU3RlcE9wdGlvbnMge1xuICByZXBvcnRlcjogbG9nLkxvZ2dlcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blBvc3QoXG4gIGN0eDogQ29udGV4dCxcbiAgc3RlcDogUnVuU3RlcE9wdGlvbixcbik6IFByb21pc2U8Q29udGV4dD4ge1xuICBjb25zdCB7IHJlcG9ydGVyIH0gPSBzdGVwO1xuICAvLyBjaGVjayBpZiBwb3N0XG4gIGlmIChzdGVwLnBvc3QpIHtcbiAgICAvLyBydW4gcG9zdFxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzY3JpcHRSZXN1bHQgPSBhd2FpdCBydW5TY3JpcHQoc3RlcC5wb3N0LCB7XG4gICAgICAgIGN0eDogY3R4LnB1YmxpYyxcbiAgICAgIH0pO1xuICAgICAgY3R4LnB1YmxpYy5zdGF0ZSA9IHNjcmlwdFJlc3VsdC5jdHguc3RhdGU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmVwb3J0ZXIud2FybmluZyhcbiAgICAgICAgYEZhaWxlZCB0byBydW4gcG9zdCBzY3JpcHQgY29kZWAsXG4gICAgICApO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY3R4O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLFNBQVMsU0FBUyxRQUFRLHdCQUF3QjtBQU1sRCxPQUFPLGVBQWUsUUFDcEIsR0FBWSxFQUNaLElBQW1CLEVBQ0Q7SUFDbEIsTUFBTSxFQUFFLFNBQVEsRUFBRSxHQUFHO0lBQ3JCLGdCQUFnQjtJQUNoQixJQUFJLEtBQUssSUFBSSxFQUFFO1FBQ2IsV0FBVztRQUNYLElBQUk7WUFDRixNQUFNLGVBQWUsTUFBTSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUM5QyxLQUFLLElBQUksTUFBTTtZQUNqQjtZQUNBLElBQUksTUFBTSxDQUFDLEtBQUssR0FBRyxhQUFhLEdBQUcsQ0FBQyxLQUFLO1FBQzNDLEVBQUUsT0FBTyxHQUFHO1lBQ1YsU0FBUyxPQUFPLENBQ2QsQ0FBQyw4QkFBOEIsQ0FBQztZQUVsQyxNQUFNLElBQUksTUFBTSxHQUFHO1FBQ3JCO0lBQ0YsQ0FBQztJQUNELE9BQU87QUFDVCxDQUFDIn0=