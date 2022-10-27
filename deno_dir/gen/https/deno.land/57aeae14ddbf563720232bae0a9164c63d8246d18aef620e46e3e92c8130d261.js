export class MemoryAdapter {
    namespaces = new Map();
    checkNamespace(ns) {
        if (this.namespaces.has(ns)) return;
        else this.namespaces.set(ns, new Map());
    }
    ns(ns) {
        this.checkNamespace(ns);
        return this.namespaces.get(ns);
    }
    // deno-lint-ignore no-explicit-any
    set(k, v, ns = "", ttl = 0) {
        const n = this.ns(ns);
        n?.set(k, {
            value: v,
            ttl
        });
        return this;
    }
    get(k, ns = "") {
        const n = this.ns(ns);
        const v = n?.get(k);
        return !v ? undefined : {
            key: k,
            ns,
            value: v.value,
            ttl: v.ttl
        };
    }
    has(k, ns = "") {
        return this.ns(ns)?.has(k) ?? false;
    }
    delete(k, ns = "") {
        const n = this.ns(ns);
        return n?.delete(k) ?? false;
    }
    keys(ns = "") {
        return [
            ...this.ns(ns)?.keys() ?? []
        ];
    }
    clear(ns = "") {
        this.namespaces.set(ns, new Map());
        return this;
    }
    deleteExpired(ns = "") {
        const n = this.ns(ns);
        for (const e of n.entries()){
            if (e[1].ttl !== 0 && Date.now() > e[1].ttl) {
                n.delete(e[0]);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gva2V5ZGJAMS4wLjAvbWVtb3J5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFkYXB0ZXIgfSBmcm9tIFwiLi9hZGFwdGVyLnRzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgTWVtb3J5QWRhcHRlciBpbXBsZW1lbnRzIEFkYXB0ZXIge1xyXG4gIG5hbWVzcGFjZXM6IE1hcDxcclxuICAgIHN0cmluZyxcclxuICAgIE1hcDxzdHJpbmcsIHsgdmFsdWU6IHN0cmluZzsgdHRsOiBudW1iZXIgfT5cclxuICA+ID0gbmV3IE1hcCgpO1xyXG5cclxuICBjaGVja05hbWVzcGFjZShuczogc3RyaW5nKSB7XHJcbiAgICBpZiAodGhpcy5uYW1lc3BhY2VzLmhhcyhucykpIHJldHVybjtcclxuICAgIGVsc2UgdGhpcy5uYW1lc3BhY2VzLnNldChucywgbmV3IE1hcCgpKTtcclxuICB9XHJcblxyXG4gIG5zKG5zOiBzdHJpbmcpIHtcclxuICAgIHRoaXMuY2hlY2tOYW1lc3BhY2UobnMpO1xyXG4gICAgcmV0dXJuIHRoaXMubmFtZXNwYWNlcy5nZXQobnMpO1xyXG4gIH1cclxuXHJcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcclxuICBzZXQoazogc3RyaW5nLCB2OiBhbnksIG5zID0gXCJcIiwgdHRsID0gMCkge1xyXG4gICAgY29uc3QgbiA9IHRoaXMubnMobnMpO1xyXG4gICAgbj8uc2V0KGssIHsgdmFsdWU6IHYsIHR0bCB9KTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgZ2V0KGs6IHN0cmluZywgbnMgPSBcIlwiKSB7XHJcbiAgICBjb25zdCBuID0gdGhpcy5ucyhucyk7XHJcbiAgICBjb25zdCB2ID0gbj8uZ2V0KGspO1xyXG4gICAgcmV0dXJuICF2ID8gdW5kZWZpbmVkIDogeyBrZXk6IGssIG5zLCB2YWx1ZTogdi52YWx1ZSwgdHRsOiB2LnR0bCB9O1xyXG4gIH1cclxuXHJcbiAgaGFzKGs6IHN0cmluZywgbnMgPSBcIlwiKSB7XHJcbiAgICByZXR1cm4gdGhpcy5ucyhucyk/LmhhcyhrKSA/PyBmYWxzZTtcclxuICB9XHJcblxyXG4gIGRlbGV0ZShrOiBzdHJpbmcsIG5zID0gXCJcIikge1xyXG4gICAgY29uc3QgbiA9IHRoaXMubnMobnMpO1xyXG4gICAgcmV0dXJuIG4/LmRlbGV0ZShrKSA/PyBmYWxzZTtcclxuICB9XHJcblxyXG4gIGtleXMobnMgPSBcIlwiKSB7XHJcbiAgICByZXR1cm4gWy4uLih0aGlzLm5zKG5zKT8ua2V5cygpID8/IFtdKV07XHJcbiAgfVxyXG5cclxuICBjbGVhcihucyA9IFwiXCIpIHtcclxuICAgIHRoaXMubmFtZXNwYWNlcy5zZXQobnMsIG5ldyBNYXAoKSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGRlbGV0ZUV4cGlyZWQobnMgPSBcIlwiKSB7XHJcbiAgICBjb25zdCBuID0gdGhpcy5ucyhucykhO1xyXG4gICAgZm9yIChjb25zdCBlIG9mIG4uZW50cmllcygpKSB7XHJcbiAgICAgIGlmIChlWzFdLnR0bCAhPT0gMCAmJiBEYXRlLm5vdygpID4gZVsxXS50dGwpIHtcclxuICAgICAgICBuLmRlbGV0ZShlWzBdKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxNQUFNO0lBQ1gsYUFHSSxJQUFJLE1BQU07SUFFZCxlQUFlLEVBQVUsRUFBRTtRQUN6QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUs7YUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJO0lBQ25DO0lBRUEsR0FBRyxFQUFVLEVBQUU7UUFDYixJQUFJLENBQUMsY0FBYyxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7SUFDN0I7SUFFQSxtQ0FBbUM7SUFDbkMsSUFBSSxDQUFTLEVBQUUsQ0FBTSxFQUFFLEtBQUssRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1FBQ3ZDLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ2xCLEdBQUcsSUFBSSxHQUFHO1lBQUUsT0FBTztZQUFHO1FBQUk7UUFDMUIsT0FBTyxJQUFJO0lBQ2I7SUFFQSxJQUFJLENBQVMsRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUN0QixNQUFNLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNsQixNQUFNLElBQUksR0FBRyxJQUFJO1FBQ2pCLE9BQU8sQ0FBQyxJQUFJLFlBQVk7WUFBRSxLQUFLO1lBQUc7WUFBSSxPQUFPLEVBQUUsS0FBSztZQUFFLEtBQUssRUFBRSxHQUFHO1FBQUMsQ0FBQztJQUNwRTtJQUVBLElBQUksQ0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksTUFBTSxLQUFLO0lBQ3JDO0lBRUEsT0FBTyxDQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDekIsTUFBTSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDbEIsT0FBTyxHQUFHLE9BQU8sTUFBTSxLQUFLO0lBQzlCO0lBRUEsS0FBSyxLQUFLLEVBQUUsRUFBRTtRQUNaLE9BQU87ZUFBSyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssVUFBVSxFQUFFO1NBQUU7SUFDekM7SUFFQSxNQUFNLEtBQUssRUFBRSxFQUFFO1FBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJO1FBQzVCLE9BQU8sSUFBSTtJQUNiO0lBRUEsY0FBYyxLQUFLLEVBQUUsRUFBRTtRQUNyQixNQUFNLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNsQixLQUFLLE1BQU0sS0FBSyxFQUFFLE9BQU8sR0FBSTtZQUMzQixJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEtBQUssS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUU7Z0JBQzNDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2YsQ0FBQztRQUNIO0lBQ0Y7QUFDRixDQUFDIn0=