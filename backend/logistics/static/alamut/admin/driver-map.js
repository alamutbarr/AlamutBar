(() => {
    const root = document.querySelector("[data-driver-map]");
    if (!root) return;
    const canvas = root.querySelector(".alamut-map-canvas");
    const message = root.querySelector(".alamut-map-message");
    const list = root.querySelector(".alamut-map-positions");
    const date = new Intl.DateTimeFormat("fa-IR", {dateStyle: "medium", timeStyle: "short"});
    const digits = new Intl.NumberFormat("fa-IR");
    const leaflet = window.L;
    const map = leaflet?.map(canvas, {scrollWheelZoom: false}).setView([32.4, 53.7], 5);
    const markers = map && leaflet.layerGroup().addTo(map);
    let fitted = false;
    let tilesFailed = false;
    let refreshFailed = false;
    let points = [];
    let previous = "";

    function showMessage() {
        message.textContent = [
            !points.length ? "برای سفرهای فعال هنوز موقعیتی ثبت نشده است." : "",
            !map || tilesFailed ? "نقشهٔ پایه در دسترس نیست. مختصات ثبت‌شده در فهرست پایین دیده می‌شود." : "",
            refreshFailed ? "به‌روزرسانی انجام نشد. آخرین اطلاعات دریافتی در حال نمایش است." : "",
        ].filter(Boolean).join(" ");
    }

    function render(next) {
        const signature = JSON.stringify(next);
        if (signature === previous) return;
        previous = signature;
        points = next;
        list.replaceChildren();
        markers?.clearLayers();
        const coordinates = [];
        for (const point of points) {
            const location = [Number(point.latitude), Number(point.longitude)];
            const item = document.createElement("li");
            const title = document.createElement("strong");
            title.textContent = point.driver + " · " + point.code;
            const coords = document.createElement("bdi");
            coords.textContent = location.join(", ");
            item.append(title, " · " + point.origin + " ← " + point.destination,
                " · " + date.format(new Date(point.observed_at)),
                " · دقت " + digits.format(point.accuracy) + " متر",
                point.stale ? " · موقعیت قدیمی · " : " · به‌روز · ", coords);
            list.append(item);
            if (!map) continue;
            coordinates.push(location);
            const tooltip = document.createElement("span");
            tooltip.textContent = title.textContent;
            const color = point.stale ? "#9a621d" : "#12675e";
            const marker = leaflet.circleMarker(location, {radius: 9, color, fillOpacity: 0.9})
                .bindTooltip(tooltip).addTo(markers);
            const focus = document.createElement("button");
            focus.type = "button";
            focus.className = "alamut-map-focus";
            focus.textContent = "تمرکز روی نقشه";
            focus.addEventListener("click", () => {
                map.setView(location, 13);
                marker.openTooltip();
            });
            item.append(" · ", focus);
        }
        if (map && !fitted && coordinates.length) {
            map.fitBounds(coordinates, {maxZoom: 13, padding: [20, 20]});
            fitted = true;
        }
        showMessage();
    }

    render(JSON.parse(root.querySelector("#alamut-map-data").textContent));
    if (map) {
        leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).on("tileerror", () => {
            tilesFailed = true;
            showMessage();
        }).on("tileload", () => {
            tilesFailed = false;
            showMessage();
        }).addTo(map);
    }
    if (root.dataset.feed) {
        async function refresh() {
            if (!document.hidden) {
                try {
                    const response = await fetch(root.dataset.feed, {cache: "no-store", redirect: "error"});
                    if (!response.ok) throw new Error(String(response.status));
                    render((await response.json()).positions);
                    refreshFailed = false;
                } catch {
                    refreshFailed = true;
                }
                showMessage();
            }
            window.setTimeout(refresh, 30000);
        }
        window.setTimeout(refresh, 30000);
    }
})();
