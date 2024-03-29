function _cache() {
    const val = window.___$GLOBAL_MODULE_CACHE;
    if (typeof val !== "object") {
        window.___$GLOBAL_MODULE_CACHE = {};
        return {};
    } else return val;
}
export class ModuleCache {
    name;
    get cache() {
        const modCache = _cache();
        if (!modCache[this.name]) {
            modCache[this.name] = {};
            return {};
        } else return modCache[this.name];
    }
    constructor(name){
        this.name = name;
        if (_cache()[name] !== undefined) throw new Error(`Module Cache already registered for ${name}`);
    }
    set(key, val) {
        this.cache[key] = val;
        return this;
    }
    get(key) {
        return this.cache[key];
    }
    delete(key) {
        return delete this.cache[key];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvbW9kdWxlX2NhY2hlQDAuMC4xL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgaW50ZXJmYWNlIEFueU9iamVjdCB7XHJcbiAgW25hbWU6IHN0cmluZ106IGFueTtcclxufVxyXG5cclxuZnVuY3Rpb24gX2NhY2hlKCk6IHsgW25hbWU6IHN0cmluZ106IEFueU9iamVjdCB9IHtcclxuICBjb25zdCB2YWwgPSAod2luZG93IGFzIGFueSkuX19fJEdMT0JBTF9NT0RVTEVfQ0FDSEU7XHJcbiAgaWYgKHR5cGVvZiB2YWwgIT09IFwib2JqZWN0XCIpIHtcclxuICAgICh3aW5kb3cgYXMgYW55KS5fX18kR0xPQkFMX01PRFVMRV9DQUNIRSA9IHt9O1xyXG4gICAgcmV0dXJuIHt9O1xyXG4gIH0gZWxzZSByZXR1cm4gdmFsO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW9kdWxlQ2FjaGUge1xyXG4gIG5hbWU6IHN0cmluZztcclxuXHJcbiAgZ2V0IGNhY2hlKCk6IEFueU9iamVjdCB7XHJcbiAgICBjb25zdCBtb2RDYWNoZSA9IF9jYWNoZSgpO1xyXG4gICAgaWYgKCFtb2RDYWNoZVt0aGlzLm5hbWVdKSB7XHJcbiAgICAgIG1vZENhY2hlW3RoaXMubmFtZV0gPSB7fTtcclxuICAgICAgcmV0dXJuIHt9O1xyXG4gICAgfSBlbHNlIHJldHVybiBtb2RDYWNoZVt0aGlzLm5hbWVdO1xyXG4gIH1cclxuXHJcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nKSB7XHJcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgaWYgKF9jYWNoZSgpW25hbWVdICE9PSB1bmRlZmluZWQpXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIENhY2hlIGFscmVhZHkgcmVnaXN0ZXJlZCBmb3IgJHtuYW1lfWApO1xyXG4gIH1cclxuXHJcbiAgc2V0KGtleTogc3RyaW5nLCB2YWw6IGFueSkge1xyXG4gICAgdGhpcy5jYWNoZVtrZXldID0gdmFsO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBnZXQ8VCA9IGFueT4oa2V5OiBzdHJpbmcpOiBUIHwgdW5kZWZpbmVkIHtcclxuICAgIHJldHVybiB0aGlzLmNhY2hlW2tleV07XHJcbiAgfVxyXG5cclxuICBkZWxldGUoa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIHJldHVybiBkZWxldGUgdGhpcy5jYWNoZVtrZXldO1xyXG4gIH1cclxufVxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsU0FBUyxTQUF3QztJQUMvQyxNQUFNLE1BQU0sQUFBQyxPQUFlLHVCQUF1QjtJQUNuRCxJQUFJLE9BQU8sUUFBUSxVQUFVO1FBQzFCLE9BQWUsdUJBQXVCLEdBQUcsQ0FBQztRQUMzQyxPQUFPLENBQUM7SUFDVixPQUFPLE9BQU87QUFDaEI7QUFFQSxPQUFPLE1BQU07SUFDWCxLQUFhO0lBRWIsSUFBSSxRQUFtQjtRQUNyQixNQUFNLFdBQVc7UUFDakIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ3ZCLE9BQU8sQ0FBQztRQUNWLE9BQU8sT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuQztJQUVBLFlBQVksSUFBWSxDQUFFO1FBQ3hCLElBQUksQ0FBQyxJQUFJLEdBQUc7UUFDWixJQUFJLFFBQVEsQ0FBQyxLQUFLLEtBQUssV0FDckIsTUFBTSxJQUFJLE1BQU0sQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsRUFBRTtJQUNuRTtJQUVBLElBQUksR0FBVyxFQUFFLEdBQVEsRUFBRTtRQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRztRQUNsQixPQUFPLElBQUk7SUFDYjtJQUVBLElBQWEsR0FBVyxFQUFpQjtRQUN2QyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSTtJQUN4QjtJQUVBLE9BQU8sR0FBVyxFQUFXO1FBQzNCLE9BQU8sT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUk7SUFDL0I7QUFDRixDQUFDIn0=