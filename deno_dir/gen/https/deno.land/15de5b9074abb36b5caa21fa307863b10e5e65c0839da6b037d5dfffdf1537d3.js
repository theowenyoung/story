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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NsaS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjYWMsIGdldFN0ZGluLCB2ZXJzaW9uIH0gZnJvbSBcIi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgcnVuIH0gZnJvbSBcIi4vY29yZS9ydW4td29ya2Zsb3dzLnRzXCI7XG5cbmZ1bmN0aW9uIG1haW4oKSB7XG4gIGNvbnN0IGNsaSA9IGNhYyhcImRlbm9mbG93XCIpO1xuICBjbGlcbiAgICAuY29tbWFuZChcInJ1biBbLi4uZmlsZXMgb3IgdXJsXVwiLCBcIlJ1biB3b3JrZmxvd3NcIilcbiAgICAub3B0aW9uKFxuICAgICAgXCItLWZvcmNlXCIsXG4gICAgICBcIkZvcmNlIHJ1biB3b3JrZmxvdyBmaWxlcywgaWYgdHJ1ZSwgd2lsbCBpZ25vcmUgdG8gcmVhZC9zYXZlIHN0YXRlXCIsXG4gICAgKS5vcHRpb24oXG4gICAgICBcIi0tZGVidWdcIixcbiAgICAgIFwiRGVidWcgbW9kZSwgd2lsbCBwcmludCBtb3JlIGluZm9cIixcbiAgICApLm9wdGlvbihcbiAgICAgIFwiLS1kYXRhYmFzZSA8ZGF0YWJhc2UtdXJsPlwiLFxuICAgICAgXCJEYXRhYmFzZSB1cmksIGRlZmF1bHQganNvbjovL2RhdGFcIixcbiAgICApLm9wdGlvbihcIi0tbGltaXQgPGxpbWl0LWNvdW50PlwiLCBcIm1heCBpdGVtcyBmb3Igd29ya2Zsb3cgZXZlcnkgcnVuc1wiKVxuICAgIC5vcHRpb24oXG4gICAgICBcIi0tc2xlZXAgPHNlY29uZHM+XCIsXG4gICAgICBcInNsZWVwIHRpbWUgYmV0d2VlbiBzb3VyY2VzLCBmaWx0ZXIsIHN0ZXBzLCB1bml0IHNlY29uZHNcIixcbiAgICApLm9wdGlvbihcbiAgICAgIFwiLS1zdGRpblwiLFxuICAgICAgXCJyZWFkIHlhbWwgZmlsZSBmcm9tIHN0ZGluLCBlLmcuIGNhdCB0ZXN0LnltbCB8IGRlbm9mbG93IHJ1biAtLXN0ZGluXCIsXG4gICAgKVxuICAgIC5hY3Rpb24oYXN5bmMgKGZpbGVzLCBvcHRpb25zKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcIkRlbm9mbG93IHZlcnNpb246IFwiLCB2ZXJzaW9uKTtcbiAgICAgIGxldCBjb250ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAob3B0aW9ucy5zdGRpbikge1xuICAgICAgICBjb250ZW50ID0gYXdhaXQgZ2V0U3RkaW4oeyBleGl0T25FbnRlcjogZmFsc2UgfSk7XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHJ1bih7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgIGZpbGVzOiBmaWxlcyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gIC8vIGRlZmF1bHQgY29tbWFuZFxuICBjbGlcbiAgICAvLyBTaW1wbHkgb21pdCB0aGUgY29tbWFuZCBuYW1lLCBqdXN0IGJyYWNrZXRzXG4gICAgLmNvbW1hbmQoXCJbU1VCIENPTU1BTkRdIFsuLi5maWxlc10gW09QVElPTlNdXCIsIFwiXCIpXG4gICAgLmFjdGlvbigoKSA9PiB7XG4gICAgICBjbGkub3V0cHV0SGVscCgpO1xuICAgIH0pO1xuXG4gIGNsaS5oZWxwKCk7XG4gIC8vIERpc3BsYXkgdmVyc2lvbiBudW1iZXIgd2hlbiBgLXZgIG9yIGAtLXZlcnNpb25gIGFwcGVhcnNcbiAgLy8gSXQncyBhbHNvIHVzZWQgaW4gaGVscCBtZXNzYWdlXG4gIGNsaS52ZXJzaW9uKHZlcnNpb24pO1xuXG4gIGNsaS5wYXJzZSgpO1xufVxuXG5pZiAoaW1wb3J0Lm1ldGEubWFpbikge1xuICBtYWluKCk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sUUFBUSxZQUFZO0FBQ25ELFNBQVMsR0FBRyxRQUFRLDBCQUEwQjtBQUU5QyxTQUFTLE9BQU87SUFDZCxNQUFNLE1BQU0sSUFBSTtJQUNoQixJQUNHLE9BQU8sQ0FBQyx5QkFBeUIsaUJBQ2pDLE1BQU0sQ0FDTCxXQUNBLHFFQUNBLE1BQU0sQ0FDTixXQUNBLG9DQUNBLE1BQU0sQ0FDTiw2QkFDQSxxQ0FDQSxNQUFNLENBQUMseUJBQXlCLHFDQUNqQyxNQUFNLENBQ0wscUJBQ0EsMkRBQ0EsTUFBTSxDQUNOLFdBQ0EsdUVBRUQsTUFBTSxDQUFDLE9BQU8sT0FBTyxVQUFZO1FBQ2hDLFFBQVEsR0FBRyxDQUFDLHNCQUFzQjtRQUNsQyxJQUFJO1FBQ0osSUFBSSxRQUFRLEtBQUssRUFBRTtZQUNqQixVQUFVLE1BQU0sU0FBUztnQkFBRSxhQUFhLEtBQUs7WUFBQztRQUNoRCxDQUFDO1FBRUQsTUFBTSxJQUFJO1lBQ1IsR0FBRyxPQUFPO1lBQ1YsU0FBUztZQUNULE9BQU87UUFDVDtJQUNGO0lBRUYsa0JBQWtCO0lBQ2xCLEdBQ0UsOENBQThDO0tBQzdDLE9BQU8sQ0FBQyxzQ0FBc0MsSUFDOUMsTUFBTSxDQUFDLElBQU07UUFDWixJQUFJLFVBQVU7SUFDaEI7SUFFRixJQUFJLElBQUk7SUFDUiwwREFBMEQ7SUFDMUQsaUNBQWlDO0lBQ2pDLElBQUksT0FBTyxDQUFDO0lBRVosSUFBSSxLQUFLO0FBQ1g7QUFFQSxJQUFJLFlBQVksSUFBSSxFQUFFO0lBQ3BCO0FBQ0YsQ0FBQyJ9