import { cac, getStdin, version } from "./deps.ts";
import { run } from "./core/run-workflows.ts";
function main() {
    const cli = cac("denoflow");
    cli.command("run [...files or url]", "Run workflows").option("--force", "Force run workflow files, if true, will ignore to read/save state").option("--debug", "Debug mode, will print more info").option("--database <database-url>", "Database uri, default json://data").option("--limit <limit-count>", "max items for workflow every runs").option("--sleep <seconds>", "sleep time between sources, filter, steps, unit seconds").option("--stdin", "read yaml file from stdin, e.g. cat test.yml | denoflow run --stdin").action(async (files, options)=>{
        console.log("Denoflow version: ", version);
        let content;
        if (options.stdin) {
            content = await getStdin({
                exitOnEnter: false
            });
        }
        await run({
            ...options,
            content: content,
            files: files
        });
    });
    // default command
    cli// Simply omit the command name, just brackets
    .command("[SUB COMMAND] [...files] [OPTIONS]", "").action(()=>{
        cli.outputHelp();
    });
    cli.help();
    // Display version number when `-v` or `--version` appears
    // It's also used in help message
    cli.version(version);
    cli.parse();
}
if (import.meta.main) {
    main();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NsaS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjYWMsIGdldFN0ZGluLCB2ZXJzaW9uIH0gZnJvbSBcIi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgcnVuIH0gZnJvbSBcIi4vY29yZS9ydW4td29ya2Zsb3dzLnRzXCI7XG5cbmZ1bmN0aW9uIG1haW4oKSB7XG4gIGNvbnN0IGNsaSA9IGNhYyhcImRlbm9mbG93XCIpO1xuICBjbGlcbiAgICAuY29tbWFuZChcInJ1biBbLi4uZmlsZXMgb3IgdXJsXVwiLCBcIlJ1biB3b3JrZmxvd3NcIilcbiAgICAub3B0aW9uKFxuICAgICAgXCItLWZvcmNlXCIsXG4gICAgICBcIkZvcmNlIHJ1biB3b3JrZmxvdyBmaWxlcywgaWYgdHJ1ZSwgd2lsbCBpZ25vcmUgdG8gcmVhZC9zYXZlIHN0YXRlXCIsXG4gICAgKS5vcHRpb24oXG4gICAgICBcIi0tZGVidWdcIixcbiAgICAgIFwiRGVidWcgbW9kZSwgd2lsbCBwcmludCBtb3JlIGluZm9cIixcbiAgICApLm9wdGlvbihcbiAgICAgIFwiLS1kYXRhYmFzZSA8ZGF0YWJhc2UtdXJsPlwiLFxuICAgICAgXCJEYXRhYmFzZSB1cmksIGRlZmF1bHQganNvbjovL2RhdGFcIixcbiAgICApLm9wdGlvbihcIi0tbGltaXQgPGxpbWl0LWNvdW50PlwiLCBcIm1heCBpdGVtcyBmb3Igd29ya2Zsb3cgZXZlcnkgcnVuc1wiKVxuICAgIC5vcHRpb24oXG4gICAgICBcIi0tc2xlZXAgPHNlY29uZHM+XCIsXG4gICAgICBcInNsZWVwIHRpbWUgYmV0d2VlbiBzb3VyY2VzLCBmaWx0ZXIsIHN0ZXBzLCB1bml0IHNlY29uZHNcIixcbiAgICApLm9wdGlvbihcbiAgICAgIFwiLS1zdGRpblwiLFxuICAgICAgXCJyZWFkIHlhbWwgZmlsZSBmcm9tIHN0ZGluLCBlLmcuIGNhdCB0ZXN0LnltbCB8IGRlbm9mbG93IHJ1biAtLXN0ZGluXCIsXG4gICAgKVxuICAgIC5hY3Rpb24oYXN5bmMgKGZpbGVzLCBvcHRpb25zKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcIkRlbm9mbG93IHZlcnNpb246IFwiLCB2ZXJzaW9uKTtcbiAgICAgIGxldCBjb250ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAob3B0aW9ucy5zdGRpbikge1xuICAgICAgICBjb250ZW50ID0gYXdhaXQgZ2V0U3RkaW4oeyBleGl0T25FbnRlcjogZmFsc2UgfSk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHJ1bih7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgIGZpbGVzOiBmaWxlcyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gIC8vIGRlZmF1bHQgY29tbWFuZFxuICBjbGlcbiAgICAvLyBTaW1wbHkgb21pdCB0aGUgY29tbWFuZCBuYW1lLCBqdXN0IGJyYWNrZXRzXG4gICAgLmNvbW1hbmQoXCJbU1VCIENPTU1BTkRdIFsuLi5maWxlc10gW09QVElPTlNdXCIsIFwiXCIpXG4gICAgLmFjdGlvbigoKSA9PiB7XG4gICAgICBjbGkub3V0cHV0SGVscCgpO1xuICAgIH0pO1xuXG4gIGNsaS5oZWxwKCk7XG4gIC8vIERpc3BsYXkgdmVyc2lvbiBudW1iZXIgd2hlbiBgLXZgIG9yIGAtLXZlcnNpb25gIGFwcGVhcnNcbiAgLy8gSXQncyBhbHNvIHVzZWQgaW4gaGVscCBtZXNzYWdlXG4gIGNsaS52ZXJzaW9uKHZlcnNpb24pO1xuXG4gIGNsaS5wYXJzZSgpO1xufVxuXG5pZiAoaW1wb3J0Lm1ldGEubWFpbikge1xuICBtYWluKCk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sUUFBUSxXQUFXLENBQUM7QUFDbkQsU0FBUyxHQUFHLFFBQVEseUJBQXlCLENBQUM7QUFFOUMsU0FBUyxJQUFJLEdBQUc7SUFDZCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEFBQUM7SUFDNUIsR0FBRyxDQUNBLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRSxlQUFlLENBQUMsQ0FDakQsTUFBTSxDQUNMLFNBQVMsRUFDVCxtRUFBbUUsQ0FDcEUsQ0FBQyxNQUFNLENBQ04sU0FBUyxFQUNULGtDQUFrQyxDQUNuQyxDQUFDLE1BQU0sQ0FDTiwyQkFBMkIsRUFDM0IsbUNBQW1DLENBQ3BDLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLG1DQUFtQyxDQUFDLENBQ3JFLE1BQU0sQ0FDTCxtQkFBbUIsRUFDbkIseURBQXlELENBQzFELENBQUMsTUFBTSxDQUNOLFNBQVMsRUFDVCxxRUFBcUUsQ0FDdEUsQ0FDQSxNQUFNLENBQUMsT0FBTyxLQUFLLEVBQUUsT0FBTyxHQUFLO1FBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0MsSUFBSSxPQUFPLEFBQW9CLEFBQUM7UUFDaEMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ2pCLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQztnQkFBRSxXQUFXLEVBQUUsS0FBSzthQUFFLENBQUMsQ0FBQztTQUNsRDtRQUVELE1BQU0sR0FBRyxDQUFDO1lBQ1IsR0FBRyxPQUFPO1lBQ1YsT0FBTyxFQUFFLE9BQU87WUFDaEIsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7S0FDSixDQUFDLENBQUM7SUFFTCxrQkFBa0I7SUFDbEIsR0FBRyxBQUNELDhDQUE4QztLQUM3QyxPQUFPLENBQUMsb0NBQW9DLEVBQUUsRUFBRSxDQUFDLENBQ2pELE1BQU0sQ0FBQyxJQUFNO1FBQ1osR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO0tBQ2xCLENBQUMsQ0FBQztJQUVMLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNYLDBEQUEwRDtJQUMxRCxpQ0FBaUM7SUFDakMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUVyQixHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7Q0FDYjtBQUVELElBQUksV0FBVyxDQUFDLElBQUksRUFBRTtJQUNwQixJQUFJLEVBQUUsQ0FBQztDQUNSIn0=