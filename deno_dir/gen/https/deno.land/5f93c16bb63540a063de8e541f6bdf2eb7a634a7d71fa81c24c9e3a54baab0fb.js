import { hasPermissionSlient } from "../permission.ts";
export const getEnv = async ()=>{
    const allEnvPermmision = {
        name: "env"
    };
    if (await hasPermissionSlient(allEnvPermmision)) {
        return Deno.env.toObject();
    } else {
        return {};
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvZGVub2Zsb3dAMC4wLjMzL2NvcmUvdXRpbHMvZW52LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGhhc1Blcm1pc3Npb25TbGllbnQgfSBmcm9tIFwiLi4vcGVybWlzc2lvbi50c1wiO1xuXG5leHBvcnQgY29uc3QgZ2V0RW52ID0gYXN5bmMgKCk6IFByb21pc2U8e1xuICBbaW5kZXg6IHN0cmluZ106IHN0cmluZztcbn0+ID0+IHtcbiAgY29uc3QgYWxsRW52UGVybW1pc2lvbiA9IHsgbmFtZTogXCJlbnZcIiB9IGFzIGNvbnN0O1xuXG4gIGlmIChhd2FpdCBoYXNQZXJtaXNzaW9uU2xpZW50KGFsbEVudlBlcm1taXNpb24pKSB7XG4gICAgcmV0dXJuIERlbm8uZW52LnRvT2JqZWN0KCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG59O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsbUJBQW1CLFFBQVEsbUJBQW1CO0FBRXZELE9BQU8sTUFBTSxTQUFTLFVBRWhCO0lBQ0osTUFBTSxtQkFBbUI7UUFBRSxNQUFNO0lBQU07SUFFdkMsSUFBSSxNQUFNLG9CQUFvQixtQkFBbUI7UUFDL0MsT0FBTyxLQUFLLEdBQUcsQ0FBQyxRQUFRO0lBQzFCLE9BQU87UUFDTCxPQUFPLENBQUM7SUFDVixDQUFDO0FBQ0gsRUFBRSJ9