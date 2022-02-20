import { getReporter } from "./report.ts";
export async function hasPermissionSlient(permission) {
    const permissionState = await Deno.permissions.query(permission);
    const is = permissionState.state === "granted";
    if (!is) {
        const reporter = await getReporter("permission", false);
        reporter.debug(`--allow-${permission.name} flag now set, skip ${permission.name} permission`);
        return false;
    }
    else {
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVybWlzc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBlcm1pc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUMxQyxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUN2QyxVQUFxQztJQUVyQyxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sRUFBRSxHQUFHLGVBQWUsQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDO0lBQy9DLElBQUksQ0FBQyxFQUFFLEVBQUU7UUFDUCxNQUFNLFFBQVEsR0FBRyxNQUFNLFdBQVcsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsUUFBUSxDQUFDLEtBQUssQ0FDWixXQUFXLFVBQVUsQ0FBQyxJQUFJLHVCQUF1QixVQUFVLENBQUMsSUFBSSxhQUFhLENBQzlFLENBQUM7UUFDRixPQUFPLEtBQUssQ0FBQztLQUNkO1NBQU07UUFDTCxPQUFPLElBQUksQ0FBQztLQUNiO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGdldFJlcG9ydGVyIH0gZnJvbSBcIi4vcmVwb3J0LnRzXCI7XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzUGVybWlzc2lvblNsaWVudChcbiAgcGVybWlzc2lvbjogRGVuby5QZXJtaXNzaW9uRGVzY3JpcHRvcixcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBwZXJtaXNzaW9uU3RhdGUgPSBhd2FpdCBEZW5vLnBlcm1pc3Npb25zLnF1ZXJ5KHBlcm1pc3Npb24pO1xuICBjb25zdCBpcyA9IHBlcm1pc3Npb25TdGF0ZS5zdGF0ZSA9PT0gXCJncmFudGVkXCI7XG4gIGlmICghaXMpIHtcbiAgICBjb25zdCByZXBvcnRlciA9IGF3YWl0IGdldFJlcG9ydGVyKFwicGVybWlzc2lvblwiLCBmYWxzZSk7XG4gICAgcmVwb3J0ZXIuZGVidWcoXG4gICAgICBgLS1hbGxvdy0ke3Blcm1pc3Npb24ubmFtZX0gZmxhZyBub3cgc2V0LCBza2lwICR7cGVybWlzc2lvbi5uYW1lfSBwZXJtaXNzaW9uYCxcbiAgICApO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuIl19