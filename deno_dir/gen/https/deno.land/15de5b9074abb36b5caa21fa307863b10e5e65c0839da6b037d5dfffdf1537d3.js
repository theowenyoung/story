import { cac, getStdin, version } from "./deps.ts";
import { run } from "./core/run-workflows.ts";
function main() {
    const cli = cac("denoflow");
    cli
        .command("run [...files or url]", "Run workflows")
        .option("--force", "Force run workflow files, if true, will ignore to read/save state").option("--debug", "Debug mode, will print more info").option("--database <database-url>", "Database uri, default json://data").option("--limit <limit-count>", "max items for workflow every runs")
        .option("--sleep <seconds>", "sleep time between sources, filter, steps, unit seconds").option("--stdin", "read yaml file from stdin, e.g. cat test.yml | denoflow run --stdin")
        .action(async (files, options) => {
        console.log("Denoflow version: ", version);
        let content;
        if (options.stdin) {
            content = await getStdin({ exitOnEnter: false });
        }
        await run({
            ...options,
            content: content,
            files: files,
        });
    });
    cli
        .command("[SUB COMMAND] [...files] [OPTIONS]", "")
        .action(() => {
        cli.outputHelp();
    });
    cli.help();
    cli.version(version);
    cli.parse();
}
if (import.meta.main) {
    main();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFOUMsU0FBUyxJQUFJO0lBQ1gsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVCLEdBQUc7U0FDQSxPQUFPLENBQUMsdUJBQXVCLEVBQUUsZUFBZSxDQUFDO1NBQ2pELE1BQU0sQ0FDTCxTQUFTLEVBQ1QsbUVBQW1FLENBQ3BFLENBQUMsTUFBTSxDQUNOLFNBQVMsRUFDVCxrQ0FBa0MsQ0FDbkMsQ0FBQyxNQUFNLENBQ04sMkJBQTJCLEVBQzNCLG1DQUFtQyxDQUNwQyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxtQ0FBbUMsQ0FBQztTQUNyRSxNQUFNLENBQ0wsbUJBQW1CLEVBQ25CLHlEQUF5RCxDQUMxRCxDQUFDLE1BQU0sQ0FDTixTQUFTLEVBQ1QscUVBQXFFLENBQ3RFO1NBQ0EsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzQyxJQUFJLE9BQTJCLENBQUM7UUFDaEMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ2pCLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ2xEO1FBRUQsTUFBTSxHQUFHLENBQUM7WUFDUixHQUFHLE9BQU87WUFDVixPQUFPLEVBQUUsT0FBTztZQUNoQixLQUFLLEVBQUUsS0FBSztTQUNiLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBR0wsR0FBRztTQUVBLE9BQU8sQ0FBQyxvQ0FBb0MsRUFBRSxFQUFFLENBQUM7U0FDakQsTUFBTSxDQUFDLEdBQUcsRUFBRTtRQUNYLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVMLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUdYLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFckIsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2QsQ0FBQztBQUVELElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDcEIsSUFBSSxFQUFFLENBQUM7Q0FDUiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNhYywgZ2V0U3RkaW4sIHZlcnNpb24gfSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBydW4gfSBmcm9tIFwiLi9jb3JlL3J1bi13b3JrZmxvd3MudHNcIjtcblxuZnVuY3Rpb24gbWFpbigpIHtcbiAgY29uc3QgY2xpID0gY2FjKFwiZGVub2Zsb3dcIik7XG4gIGNsaVxuICAgIC5jb21tYW5kKFwicnVuIFsuLi5maWxlcyBvciB1cmxdXCIsIFwiUnVuIHdvcmtmbG93c1wiKVxuICAgIC5vcHRpb24oXG4gICAgICBcIi0tZm9yY2VcIixcbiAgICAgIFwiRm9yY2UgcnVuIHdvcmtmbG93IGZpbGVzLCBpZiB0cnVlLCB3aWxsIGlnbm9yZSB0byByZWFkL3NhdmUgc3RhdGVcIixcbiAgICApLm9wdGlvbihcbiAgICAgIFwiLS1kZWJ1Z1wiLFxuICAgICAgXCJEZWJ1ZyBtb2RlLCB3aWxsIHByaW50IG1vcmUgaW5mb1wiLFxuICAgICkub3B0aW9uKFxuICAgICAgXCItLWRhdGFiYXNlIDxkYXRhYmFzZS11cmw+XCIsXG4gICAgICBcIkRhdGFiYXNlIHVyaSwgZGVmYXVsdCBqc29uOi8vZGF0YVwiLFxuICAgICkub3B0aW9uKFwiLS1saW1pdCA8bGltaXQtY291bnQ+XCIsIFwibWF4IGl0ZW1zIGZvciB3b3JrZmxvdyBldmVyeSBydW5zXCIpXG4gICAgLm9wdGlvbihcbiAgICAgIFwiLS1zbGVlcCA8c2Vjb25kcz5cIixcbiAgICAgIFwic2xlZXAgdGltZSBiZXR3ZWVuIHNvdXJjZXMsIGZpbHRlciwgc3RlcHMsIHVuaXQgc2Vjb25kc1wiLFxuICAgICkub3B0aW9uKFxuICAgICAgXCItLXN0ZGluXCIsXG4gICAgICBcInJlYWQgeWFtbCBmaWxlIGZyb20gc3RkaW4sIGUuZy4gY2F0IHRlc3QueW1sIHwgZGVub2Zsb3cgcnVuIC0tc3RkaW5cIixcbiAgICApXG4gICAgLmFjdGlvbihhc3luYyAoZmlsZXMsIG9wdGlvbnMpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKFwiRGVub2Zsb3cgdmVyc2lvbjogXCIsIHZlcnNpb24pO1xuICAgICAgbGV0IGNvbnRlbnQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmIChvcHRpb25zLnN0ZGluKSB7XG4gICAgICAgIGNvbnRlbnQgPSBhd2FpdCBnZXRTdGRpbih7IGV4aXRPbkVudGVyOiBmYWxzZSB9KTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgcnVuKHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgY29udGVudDogY29udGVudCxcbiAgICAgICAgZmlsZXM6IGZpbGVzLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgLy8gZGVmYXVsdCBjb21tYW5kXG4gIGNsaVxuICAgIC8vIFNpbXBseSBvbWl0IHRoZSBjb21tYW5kIG5hbWUsIGp1c3QgYnJhY2tldHNcbiAgICAuY29tbWFuZChcIltTVUIgQ09NTUFORF0gWy4uLmZpbGVzXSBbT1BUSU9OU11cIiwgXCJcIilcbiAgICAuYWN0aW9uKCgpID0+IHtcbiAgICAgIGNsaS5vdXRwdXRIZWxwKCk7XG4gICAgfSk7XG5cbiAgY2xpLmhlbHAoKTtcbiAgLy8gRGlzcGxheSB2ZXJzaW9uIG51bWJlciB3aGVuIGAtdmAgb3IgYC0tdmVyc2lvbmAgYXBwZWFyc1xuICAvLyBJdCdzIGFsc28gdXNlZCBpbiBoZWxwIG1lc3NhZ2VcbiAgY2xpLnZlcnNpb24odmVyc2lvbik7XG5cbiAgY2xpLnBhcnNlKCk7XG59XG5cbmlmIChpbXBvcnQubWV0YS5tYWluKSB7XG4gIG1haW4oKTtcbn1cbiJdfQ==