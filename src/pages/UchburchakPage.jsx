import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

// O'lchov birliklari
const UNITS = {
    mm: { name: 'Millimetr', symbol: 'mm', factor: 0.001 },
    sm: { name: 'Santimetr', symbol: 'sm', factor: 0.01 },
    m: { name: 'Metr', symbol: 'm', factor: 1 }
};

// Uchburchak turlari
const TRIANGLE_TYPES = {
    custom: { name: "Ixtiyoriy", icon: "✏️" },
    equilateral: { name: "Teng tomonli", icon: "△" },
    isosceles: { name: "Teng yonli", icon: "▲" },
    right: { name: "To'g'ri burchakli", icon: "◢" }
};

// Burchak bo'yicha uchburchak turlari
const ANGLE_TYPES = {
    acute: { name: "O'tkir burchakli", icon: "◿", description: "Barcha burchaklar 90° dan kichik" },
    right: { name: "To'g'ri burchakli", icon: "◢", description: "Bitta burchak 90° ga teng" },
    obtuse: { name: "O'tmas burchakli", icon: "◺", description: "Bitta burchak 90° dan katta" }
};

// Rang palitra
const COLORS = {
    primary: '#10b981',
    secondary: '#6366f1',
    accent: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6'
};

const COLOR_PALETTE = [
    '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#000000'
];

// ===== Umumiy chizish funksiyasi: uchburchak ko'rinish elementlari =====
// Ikkala canvasda (asosiy va fullscreen) ishlatiladi. anim — har bir element uchun 0..1 animatsiya progressi.
function drawTriangleFeatures(ctx, points, { a, b, c, angleA, angleB, angleC, anim, unitSuffix = '', seedRects = [] }) {
        // Animatsiya yordamchilari
        const clamp01 = (v) => Math.max(0, Math.min(1, v));
        // 3 ta elementni birin-ketin (stagger) chiqarish uchun
        const stagger = (p, i) => clamp01((p - i * 0.18) / 0.64);

        // ===== Yozuvlar to'qnashuvini oldini olish tizimi =====
        // Joylashtirilgan yozuvlarning to'rtburchaklarini saqlaymiz; yangi yozuv
        // mavjudlari bilan kesishsa, uni tashqi yo'nalishda suramiz (overlapsiz qilamiz).
        const placedRects = seedRects.map(r => ({ ...r }));
        const _overlap = (A, B) => !(A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y);
        // cx,cy — yozuv markazi; w,h — o'lcham; dx,dy — siljitishning afzal yo'nalishi.
        // To'qnashuvsiz eng yaqin markazni qaytaradi va bandlangan to'rtburchakni ro'yxatga oladi.
        const _fits = (nx, ny, w, h) => {
            const pad = 2;
            const r = { x: nx - w / 2 - pad, y: ny - h / 2 - pad, w: w + pad * 2, h: h + pad * 2 };
            return placedRects.some(p => _overlap(r, p)) ? null : r;
        };
        const placeLabel = (cx, cy, w, h, dx = 0, dy = 0) => {
            // 1) Avval afzal joyni sinaymiz
            let r = _fits(cx, cy, w, h);
            if (r) { placedRects.push(r); return { x: cx, y: cy }; }
            // 2) Spiral: afzal yo'nalishdan boshlab, asta aylanib eng yaqin bo'sh joyni topamiz
            const len = Math.hypot(dx, dy);
            const baseAng = len > 0.001 ? Math.atan2(dy, dx) : -Math.PI / 2; // standart: yuqoriga
            const angOffsets = [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2.0, -2.0, 2.6, -2.6, Math.PI];
            for (let dist = 7; dist <= 110; dist += 7) {
                for (const da of angOffsets) {
                    const ang = baseAng + da;
                    const nx = cx + Math.cos(ang) * dist;
                    const ny = cy + Math.sin(ang) * dist;
                    r = _fits(nx, ny, w, h);
                    if (r) { placedRects.push(r); return { x: nx, y: ny }; }
                }
            }
            // 3) Bo'sh joy topilmadi — afzal joyga qo'yamiz
            const pad = 2;
            const fallback = { x: cx - w / 2 - pad, y: cy - h / 2 - pad, w: w + pad * 2, h: h + pad * 2 };
            placedRects.push(fallback);
            return { x: cx, y: cy };
        };

        // Balandlik (agar ko'rsatish kerak bo'lsa)
        if (anim.height > 0.001) {
            // Animatsiya: chiziq C cho'qqisidan asos tomon o'sib chiqadi
            const hProg = anim.height;
            const hLineProg = clamp01(hProg / 0.7);

            // C nuqtadan AB ga balandlik
            const t = ((points[2].x - points[0].x) * (points[1].x - points[0].x) +
                (points[2].y - points[0].y) * (points[1].y - points[0].y)) /
                ((points[1].x - points[0].x) ** 2 + (points[1].y - points[0].y) ** 2);

            const hx = points[0].x + t * (points[1].x - points[0].x);
            const hy = points[0].y + t * (points[1].y - points[0].y);

            // Balandlik chizig'i (dashed)
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(points[2].x, points[2].y);
            ctx.lineTo(points[2].x + (hx - points[2].x) * hLineProg, points[2].y + (hy - points[2].y) * hLineProg);
            ctx.stroke();

            // Agar balandlik uchburchak tashqarisiga tushsa, asosni uzaytirib chizamiz
            // (chiziq to'liq chizilgandan keyin)
            if (t < 0 && hProg > 0.7) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                ctx.lineTo(hx, hy);
                ctx.stroke();
            } else if (t > 1 && hProg > 0.7) {
                ctx.beginPath();
                ctx.moveTo(points[1].x, points[1].y);
                ctx.lineTo(hx, hy);
                ctx.stroke();
            }

            ctx.setLineDash([]);

            // Balandlik uzunligini hisoblash
            const heightLength = Math.sqrt((points[2].x - hx) ** 2 + (points[2].y - hy) ** 2);

            // Faqat balandlik 0 dan katta bo'lganda chizish
            if (heightLength > 1) {
                // Yozuv va 90° belgisi chiziq chizilib bo'lgach paydo bo'ladi
                ctx.save();
                ctx.globalAlpha = clamp01((hProg - 0.6) / 0.4);
                // Uchburchak markazini hisoblash
                const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
                const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

                // h label joylashuvi - balandlik chizig'ining o'rtasida, uchburchak tashqarisida
                const midHX = (points[2].x + hx) / 2;
                const midHY = (points[2].y + hy) / 2;

                // Balandlik chizig'iga perpendikulyar yo'nalish
                const hdx = hx - points[2].x;
                const hdy = hy - points[2].y;
                const hLen = Math.sqrt(hdx * hdx + hdy * hdy);
                let offsetX = -hdy / hLen * 20;
                let offsetY = hdx / hLen * 20;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = midHX + offsetX;
                const testY = midHY + offsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromMid = Math.sqrt((midHX - centroidX) ** 2 + (midHY - centroidY) ** 2);

                if (distToCentroid < distFromMid) {
                    offsetX = -offsetX;
                    offsetY = -offsetY;
                }

                // h label foni (to'qnashuvsiz joylashtirish)
                ctx.font = 'bold 14px Inter, sans-serif';
                const hPos = placeLabel(midHX + offsetX, midHY + offsetY, 24, 24, offsetX, offsetY);
                const labelX = hPos.x, labelY = hPos.y;
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(labelX - 12, labelY - 12, 24, 24, 6);
                ctx.fill();
                ctx.strokeStyle = COLORS.accent;
                ctx.lineWidth = 1;
                ctx.stroke();

                // h label matni
                ctx.fillStyle = COLORS.accent;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('h', labelX, labelY);

                // To'g'ri burchak belgisi (90° kvadrat)
                const size = 10;

                // AB tomoni yo'nalishi
                const abLen = Math.sqrt((points[1].x - points[0].x) ** 2 + (points[1].y - points[0].y) ** 2);
                const abDx = (points[1].x - points[0].x) / abLen;
                const abDy = (points[1].y - points[0].y) / abLen;

                // Balandlik yo'nalishi (H dan C ga - yuqoriga qarab)
                const hDirX = (points[2].x - hx) / hLen;
                const hDirY = (points[2].y - hy) / hLen;

                // Draw right angle mark - simple L shape
                ctx.strokeStyle = COLORS.accent;
                ctx.lineWidth = 1.5;
                ctx.beginPath();

                // Start point along AB. Agar balandlik tashqariga tushsa, uchburchak tomoniga qarab chizamiz
                const sign = (t < 0) ? 1 : -1;
                const startX = hx + abDx * size * sign;
                const startY = hy + abDy * size * sign;

                // Corner point (up from start towards C)
                const cornerX = startX + hDirX * size;
                const cornerY = startY + hDirY * size;

                // End point (straight up from H towards C)
                const endX = hx + hDirX * size;
                const endY = hy + hDirY * size;

                ctx.moveTo(startX, startY);
                ctx.lineTo(cornerX, cornerY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Burchak yoylari
        if (anim.angles > 0.001) {
            const arcRadius = 25;

            points.forEach((point, i) => {
                const prev = points[(i + 2) % 3];
                const next = points[(i + 1) % 3];

                const angle1 = Math.atan2(prev.y - point.y, prev.x - point.x);
                const angle2 = Math.atan2(next.y - point.y, next.x - point.x);

                // Burchak yoyi - to'g'ri yo'nalishni aniqlash
                // Uchburchak ichidagi burchakni chizish uchun kichik yoyni tanlash kerak
                let startAngle = angle1;
                let endAngle = angle2;

                // Burchaklar orasidagi farqni hisoblash
                let diff = endAngle - startAngle;

                // Farqni [-π, π] oralig'iga keltirish
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;

                // Agar farq musbat bo'lsa (0..180), soat yo'nalishida chizish (counterclockwise = false)
                // Agar manfiy bo'lsa (-180..0), soat yo'nalishiga qarshi chizish (counterclockwise = true)
                const counterclockwise = diff < 0;

                // Animatsiya: yoylar birin-ketin sweep bilan ochiladi
                const prog = stagger(anim.angles, i);
                if (prog <= 0) return;
                const animEnd = startAngle + diff * prog;

                // Burchak yoyi gradient
                const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, arcRadius);
                gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
                gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.arc(point.x, point.y, arcRadius, startAngle, animEnd, counterclockwise);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                // Gradus yozuvi yoy ochilib bo'lgach paydo bo'ladi
                if (prog < 0.6) return;
                ctx.save();
                ctx.globalAlpha = clamp01((prog - 0.6) / 0.4);

                // Burchak qiymati - o'rta burchakni to'g'ri hisoblash
                // O'rta burchak ichki yoy markazida bo'lishi kerak
                let midAngle;
                if (counterclockwise) {
                    // Soat yo'nalishiga qarshi - startAngle dan diff/2 ni ayirish
                    midAngle = startAngle - Math.abs(diff) / 2;
                } else {
                    // Soat yo'nalishida - startAngle ga diff/2 ni qo'shish
                    midAngle = startAngle + Math.abs(diff) / 2;
                }

                const textRadius = arcRadius + 20;
                const angleText = `${point.angle.toFixed(1)}°`;
                ctx.font = 'bold 12px Inter, sans-serif';
                const textWidth = ctx.measureText(angleText).width + 8;

                // To'qnashuvsiz joylashtirish (yoydan tashqariga qarab suriladi)
                const aPos = placeLabel(
                    point.x + Math.cos(midAngle) * textRadius,
                    point.y + Math.sin(midAngle) * textRadius,
                    textWidth, 18, Math.cos(midAngle), Math.sin(midAngle)
                );
                const tx = aPos.x, ty = aPos.y;

                // Background for readability
                ctx.fillStyle = 'rgba(23, 23, 31, 0.8)';
                ctx.beginPath();
                ctx.roundRect(tx - textWidth / 2, ty - 9, textWidth, 18, 4);
                ctx.fill();

                ctx.fillStyle = COLORS.purple;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(angleText, tx, ty);
                ctx.restore();
            });
        }

        // Tashqi burchak yoylari
        if (anim.external > 0.001) {
            const extArcRadius = 35;

            points.forEach((point, i) => {
                const prev = points[(i + 2) % 3];
                const next = points[(i + 1) % 3];

                // Ichki burchak yo'nalishlari
                const angleToPrev = Math.atan2(prev.y - point.y, prev.x - point.x);
                const angleToNext = Math.atan2(next.y - point.y, next.x - point.x);

                // Tashqi burchak = 180° - ichki burchak
                const externalAngle = 180 - point.angle;

                // Tashqi burchak uchun: tomonlardan birining davomini (180° burilish) va boshqa tomon orasida
                // Tashqi burchak "prev" tomoni davomi va "next" tomoni orasida
                const extAngleStart = angleToNext;
                const extAngleEnd = angleToPrev + Math.PI; // prev tomoni davomi (180° burilgan)

                // Burchaklar orasidagi farqni hisoblash
                let diff = extAngleEnd - extAngleStart;

                // Farqni [-π, π] oralig'iga keltirish
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;

                // Kichik yoyni tanlash uchun yo'nalishni aniqlash
                // Tashqi burchak uchun bizga katta yoy kerak (180° dan katta)
                // Shuning uchun teskari yo'nalishda chizamiz
                const counterclockwise = diff < 0;

                // Animatsiya: har bir cho'qqi yoyini birin-ketin, sweep bilan chizish
                const prog = stagger(anim.external, i);
                if (prog <= 0) return;
                const animEnd = extAngleStart + diff * prog;

                // Tashqi burchak gradiyent rangi
                const extGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, extArcRadius);
                extGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
                extGradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');

                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.arc(point.x, point.y, extArcRadius, extAngleStart, animEnd, counterclockwise);
                ctx.closePath();
                ctx.fillStyle = extGradient;
                ctx.fill();

                // Tashqi burchak yoy chizig'i
                ctx.beginPath();
                ctx.arc(point.x, point.y, extArcRadius, extAngleStart, animEnd, counterclockwise);
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 2]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Yozuv yoy chizilib bo'lgach paydo bo'ladi (fade-in)
                if (prog < 0.65) return;
                ctx.save();
                ctx.globalAlpha = clamp01((prog - 0.65) / 0.35);

                // Tashqi burchak qiymati joylashuvi - o'rta burchakni to'g'ri hisoblash
                let midAngle;
                if (counterclockwise) {
                    // Soat yo'nalishiga qarshi chizilgan
                    midAngle = extAngleStart - Math.abs(diff) / 2;
                } else {
                    // Soat yo'nalishida chizilgan
                    midAngle = extAngleStart + Math.abs(diff) / 2;
                }

                const extTextRadius = extArcRadius + 20;

                // Tashqi burchak label fon (to'qnashuvsiz joylashtirish)
                const extLabel = `${externalAngle.toFixed(1)}°`;
                ctx.font = 'bold 11px Inter, sans-serif';
                const extTextWidth = ctx.measureText(extLabel).width + 10;
                const ePos = placeLabel(
                    point.x + Math.cos(midAngle) * extTextRadius,
                    point.y + Math.sin(midAngle) * extTextRadius,
                    extTextWidth, 20, Math.cos(midAngle), Math.sin(midAngle)
                );
                const etx = ePos.x, ety = ePos.y;
                ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
                ctx.beginPath();
                ctx.roundRect(etx - extTextWidth / 2, ety - 10, extTextWidth, 20, 4);
                ctx.fill();
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Tashqi burchak qiymati matni
                ctx.fillStyle = '#06b6d4';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(extLabel, etx, ety);
                ctx.restore();
            });
        }

        // Medianlar
        if (anim.median > 0.001) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // Har bir cho'qqidan qarama-qarshi tomon o'rtasiga chiziq
            const medians = [
                { vertex: 0, side: [1, 2], color: '#f43f5e', label: 'mₐ' }, // A dan BC o'rtasiga
                { vertex: 1, side: [0, 2], color: '#a855f7', label: 'mᵦ' }, // B dan AC o'rtasiga
                { vertex: 2, side: [0, 1], color: '#22c55e', label: 'mᴄ' }  // C dan AB o'rtasiga
            ];

            medians.forEach((median, mIdx) => {
                const vertexPoint = points[median.vertex];
                // Qarama-qarshi tomon o'rtasi
                const midX = (points[median.side[0]].x + points[median.side[1]].x) / 2;
                const midY = (points[median.side[0]].y + points[median.side[1]].y) / 2;

                // Animatsiya: chiziq cho'qqidan o'rta tomon o'sib chiqadi
                const prog = stagger(anim.median, mIdx);
                if (prog <= 0) return;
                const growX = vertexPoint.x + (midX - vertexPoint.x) * prog;
                const growY = vertexPoint.y + (midY - vertexPoint.y) * prog;

                // Median chizig'i
                ctx.beginPath();
                ctx.moveTo(vertexPoint.x, vertexPoint.y);
                ctx.lineTo(growX, growY);
                ctx.strokeStyle = median.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 3]);
                ctx.stroke();
                ctx.setLineDash([]);

                // O'rta nuqta va yozuv chiziq yetib borgach paydo bo'ladi
                if (prog < 0.7) return;
                ctx.save();
                ctx.globalAlpha = clamp01((prog - 0.7) / 0.3);

                // O'rta nuqta belgisi
                ctx.beginPath();
                ctx.arc(midX, midY, 4, 0, Math.PI * 2);
                ctx.fillStyle = median.color;
                ctx.fill();

                // Median label - cho'qqiga yaqinroq joylashtiramiz (markaziy to'planishni kamaytirish uchun)
                const mFrac = 0.34;
                const labelX = vertexPoint.x + (midX - vertexPoint.x) * mFrac;
                const labelY = vertexPoint.y + (midY - vertexPoint.y) * mFrac;

                // Label offset (median chizig'iga perpendikulyar)
                const dx = midX - vertexPoint.x;
                const dy = midY - vertexPoint.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                let offsetX = -dy / len * 18;
                let offsetY = dx / len * 18;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = labelX + offsetX;
                const testY = labelY + offsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromLabel = Math.sqrt((labelX - centroidX) ** 2 + (labelY - centroidY) ** 2);

                if (distToCentroid < distFromLabel) {
                    offsetX = -offsetX;
                    offsetY = -offsetY;
                }

                ctx.font = 'bold 11px Inter, sans-serif';
                const textWidth = ctx.measureText(median.label).width + 8;
                const mPos = placeLabel(labelX + offsetX, labelY + offsetY, textWidth, 20, offsetX, offsetY);
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(mPos.x - textWidth / 2, mPos.y - 10, textWidth, 20, 4);
                ctx.fill();
                ctx.strokeStyle = median.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = median.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(median.label, mPos.x, mPos.y);
                ctx.restore();
            });

            // Og'irlik markazi (Centroid) - medianlar kesishgan joy
            // Animatsiya: barcha medianlar chizilgach paydo bo'ladi
            ctx.save();
            ctx.globalAlpha = clamp01((anim.median - 0.75) / 0.25);
            // Centroid nuqtasi
            ctx.beginPath();
            ctx.arc(centroidX, centroidY, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(centroidX, centroidY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();

            // Centroid label (to'qnashuvsiz joylashtirish)
            ctx.font = 'bold 11px Inter, sans-serif';
            const gPos = placeLabel(centroidX + 23, centroidY, 22, 20, 1, 0);
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(gPos.x - 11, gPos.y - 10, 22, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('G', gPos.x, gPos.y);
            ctx.restore();
        }

        // Bissektrisalar
        if (anim.bisector > 0.001) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // Har bir cho'qqidan burchakni ikkiga bo'luvchi chiziq
            const bisectors = [
                { vertex: 0, oppositeSide: [1, 2], color: '#ec4899', label: 'lₐ' }, // A dan
                { vertex: 1, oppositeSide: [0, 2], color: '#14b8a6', label: 'lᵦ' }, // B dan
                { vertex: 2, oppositeSide: [0, 1], color: '#f97316', label: 'lᴄ' }  // C dan
            ];

            bisectors.forEach((bisector, idx) => {
                const vertexPoint = points[bisector.vertex];
                const p1 = points[bisector.oppositeSide[0]];
                const p2 = points[bisector.oppositeSide[1]];

                // Bissektrisa qarama-qarshi tomonda qayerda kesishishini topish
                // Bissektrisa teoremasi: BD/DC = AB/AC
                // Qarama-qarshi tomon uzunliklari
                const side1Len = Math.sqrt(Math.pow(vertexPoint.x - p1.x, 2) + Math.pow(vertexPoint.y - p1.y, 2));
                const side2Len = Math.sqrt(Math.pow(vertexPoint.x - p2.x, 2) + Math.pow(vertexPoint.y - p2.y, 2));

                // Kesishish nuqtasi (p1 va p2 orasida, side1Len:side2Len nisbatida)
                const ratio = side1Len / (side1Len + side2Len);
                const intersectX = p1.x + ratio * (p2.x - p1.x);
                const intersectY = p1.y + ratio * (p2.y - p1.y);

                // Animatsiya: chiziq cho'qqidan kesishish nuqtasi tomon o'sib chiqadi
                const prog = stagger(anim.bisector, idx);
                if (prog <= 0) return;
                const growX = vertexPoint.x + (intersectX - vertexPoint.x) * prog;
                const growY = vertexPoint.y + (intersectY - vertexPoint.y) * prog;

                // Bissektrisa chizig'i
                ctx.beginPath();
                ctx.moveTo(vertexPoint.x, vertexPoint.y);
                ctx.lineTo(growX, growY);
                ctx.strokeStyle = bisector.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Kesishish nuqtasi va yozuv chiziq yetib borgach paydo bo'ladi
                if (prog < 0.7) return;
                ctx.save();
                ctx.globalAlpha = clamp01((prog - 0.7) / 0.3);

                // Kesishish nuqtasi belgisi
                ctx.beginPath();
                ctx.arc(intersectX, intersectY, 4, 0, Math.PI * 2);
                ctx.fillStyle = bisector.color;
                ctx.fill();

                // Bissektrisa label - tomonga yaqinroq joylashtiramiz (median yozuvlaridan ajratish uchun)
                const lFrac = 0.66;
                const labelX = vertexPoint.x + (intersectX - vertexPoint.x) * lFrac;
                const labelY = vertexPoint.y + (intersectY - vertexPoint.y) * lFrac;

                const dx = intersectX - vertexPoint.x;
                const dy = intersectY - vertexPoint.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                let offsetX = -dy / len * 18;
                let offsetY = dx / len * 18;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = labelX + offsetX;
                const testY = labelY + offsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromLabel = Math.sqrt((labelX - centroidX) ** 2 + (labelY - centroidY) ** 2);

                if (distToCentroid < distFromLabel) {
                    offsetX = -offsetX;
                    offsetY = -offsetY;
                }

                ctx.font = 'bold 11px Inter, sans-serif';
                const textWidth = ctx.measureText(bisector.label).width + 8;
                const biPos = placeLabel(labelX + offsetX, labelY + offsetY, textWidth, 20, offsetX, offsetY);
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(biPos.x - textWidth / 2, biPos.y - 10, textWidth, 20, 4);
                ctx.fill();
                ctx.strokeStyle = bisector.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = bisector.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(bisector.label, biPos.x, biPos.y);
                ctx.restore();
            });

            // Incenter (bissektrisalar kesishgan nuqta) - ichki chizilgan aylana markazi
            // Animatsiya: bissektrisalar chizilgach paydo bo'ladi
            ctx.save();
            ctx.globalAlpha = clamp01((anim.bisector - 0.75) / 0.25);
            // Incenter koordinatalari: (a*Ax + b*Bx + c*Cx)/(a+b+c), (a*Ay + b*By + c*Cy)/(a+b+c)
            const perimeter = a + b + c;
            const incenterX = (a * points[0].x + b * points[1].x + c * points[2].x) / perimeter;
            const incenterY = (a * points[0].y + b * points[1].y + c * points[2].y) / perimeter;

            // Incenter nuqtasi
            ctx.beginPath();
            ctx.arc(incenterX, incenterY, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(incenterX, incenterY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ec4899';
            ctx.fill();

            // Incenter label (to'qnashuvsiz joylashtirish)
            ctx.font = 'bold 11px Inter, sans-serif';
            const iPos = placeLabel(incenterX + 21, incenterY, 18, 20, 1, 0);
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(iPos.x - 9, iPos.y - 10, 18, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ec4899';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('I', iPos.x, iPos.y);
            ctx.restore();
        }

        // Ichki aylana (Incircle)
        if (anim.incircle > 0.001) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // Incenter koordinatalari
            const perimeter = a + b + c;
            const incenterX = (a * points[0].x + b * points[1].x + c * points[2].x) / perimeter;
            const incenterY = (a * points[0].y + b * points[1].y + c * points[2].y) / perimeter;

            // Inradius (ichki aylana radiusi) - to'g'ridan-to'g'ri piksel koordinatalaridan
            // (scale o'zgaruvchisiga tayanmaydi, ikkala canvasda ham to'g'ri ishlaydi)
            const dpx = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
            const abPx = dpx(points[0], points[1]);
            const bcPx = dpx(points[1], points[2]);
            const caPx = dpx(points[2], points[0]);
            const sPx = (abPx + bcPx + caPx) / 2;
            const areaPx = Math.sqrt(Math.max(0, sPx * (sPx - abPx) * (sPx - bcPx) * (sPx - caPx)));
            const inradiusScaled = sPx > 0 ? areaPx / sPx : 0;

            // Animatsiya progressi
            const inProg = anim.incircle;
            ctx.save();

            // Aylana ichki gradient (asta paydo bo'ladi)
            ctx.globalAlpha = inProg;
            const incircleGradient = ctx.createRadialGradient(
                incenterX, incenterY, 0,
                incenterX, incenterY, inradiusScaled
            );
            incircleGradient.addColorStop(0, 'rgba(34, 211, 238, 0.15)');
            incircleGradient.addColorStop(1, 'rgba(34, 211, 238, 0.05)');
            ctx.beginPath();
            ctx.arc(incenterX, incenterY, inradiusScaled, 0, Math.PI * 2);
            ctx.fillStyle = incircleGradient;
            ctx.fill();
            ctx.globalAlpha = 1;

            // Ichki aylana chizish (yuqoridan sweep bilan aylanib chiziladi)
            ctx.beginPath();
            ctx.arc(incenterX, incenterY, inradiusScaled, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * inProg);
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([]);
            ctx.stroke();

            // Incenter nuqtasi (boshidayoq tez paydo bo'ladi)
            ctx.globalAlpha = clamp01(inProg * 2);
            ctx.beginPath();
            ctx.arc(incenterX, incenterY, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(incenterX, incenterY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#22d3ee';
            ctx.fill();
            ctx.globalAlpha = 1;

            // Radius chizig'i (markazdan AB tomonga perpendikulyar)
            const abDx = points[1].x - points[0].x;
            const abDy = points[1].y - points[0].y;
            const abLen = Math.sqrt(abDx * abDx + abDy * abDy);

            // Perpendikulyar yo'nalish (AB tomonga)
            let perpX = -abDy / abLen;
            let perpY = abDx / abLen;

            // Incenterdan AB tomonga perpendikulyar nuqtani topish
            // Incenterdan AB chizig'iga proyeksiya
            const t = ((incenterX - points[0].x) * abDx + (incenterY - points[0].y) * abDy) / (abLen * abLen);
            const footX = points[0].x + t * abDx;
            const footY = points[0].y + t * abDy;

            // Radius chizig'i (incenterdan AB tomon ustidagi nuqtaga)
            // Animatsiya: aylana yarmidan oshgach markazdan o'sib chiqadi
            const rProg = clamp01((inProg - 0.45) / 0.45);
            if (rProg > 0) {
                ctx.beginPath();
                ctx.moveTo(incenterX, incenterY);
                ctx.lineTo(incenterX + (footX - incenterX) * rProg, incenterY + (footY - incenterY) * rProg);
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Yozuvlar animatsiya oxirida paydo bo'ladi
            ctx.globalAlpha = clamp01((inProg - 0.75) / 0.25);

            // Radius label - radius chizig'iga perpendikulyar, tashqarida
            const rMidX = (incenterX + footX) / 2;
            const rMidY = (incenterY + footY) / 2;

            // Radius chizig'iga perpendikulyar yo'nalish
            const rDx = footX - incenterX;
            const rDy = footY - incenterY;
            const rLen = Math.sqrt(rDx * rDx + rDy * rDy);

            if (rLen > 1) {
                let rOffsetX = -rDy / rLen * 18;
                let rOffsetY = rDx / rLen * 18;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = rMidX + rOffsetX;
                const testY = rMidY + rOffsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromMid = Math.sqrt((rMidX - centroidX) ** 2 + (rMidY - centroidY) ** 2);

                if (distToCentroid < distFromMid) {
                    rOffsetX = -rOffsetX;
                    rOffsetY = -rOffsetY;
                }

                ctx.font = 'bold 11px Inter, sans-serif';
                const rPos = placeLabel(rMidX + rOffsetX, rMidY + rOffsetY, 20, 20, rOffsetX, rOffsetY);
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(rPos.x - 10, rPos.y - 10, 20, 20, 4);
                ctx.fill();
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#22d3ee';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('r', rPos.x, rPos.y);
            }

            // Incenter label (agar bissektrisa ko'rsatilmagan bo'lsa)
            if (anim.bisector <= 0.001) {
                ctx.font = 'bold 11px Inter, sans-serif';
                const iiPos = placeLabel(incenterX + 19, incenterY - 8, 18, 20, 1, -0.5);
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(iiPos.x - 9, iiPos.y - 10, 18, 20, 4);
                ctx.fill();
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#22d3ee';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('I', iiPos.x, iiPos.y);
            }
            ctx.restore();
        }

        // Tashqi aylana (Circumcircle)
        if (anim.circumcircle > 0.001) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // Circumcenter - uchburchak cho'qqilaridan teng masofada bo'lgan nuqta
            // Circumcenter formulasi
            const ax = points[0].x, ay = points[0].y;
            const bx = points[1].x, by = points[1].y;
            const cx = points[2].x, cy = points[2].y;

            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

            if (Math.abs(d) > 0.0001) {
                const circumcenterX = ((ax * ax + ay * ay) * (by - cy) +
                    (bx * bx + by * by) * (cy - ay) +
                    (cx * cx + cy * cy) * (ay - by)) / d;
                const circumcenterY = ((ax * ax + ay * ay) * (cx - bx) +
                    (bx * bx + by * by) * (ax - cx) +
                    (cx * cx + cy * cy) * (bx - ax)) / d;

                // Circumradius - markazdan cho'qqigacha masofa
                const circumradiusScaled = Math.sqrt(
                    Math.pow(circumcenterX - ax, 2) +
                    Math.pow(circumcenterY - ay, 2)
                );

                // Animatsiya progressi
                const ccProg = anim.circumcircle;
                ctx.save();

                // Aylana ichki gradient (asta paydo bo'ladi)
                ctx.globalAlpha = ccProg;
                const circumGradient = ctx.createRadialGradient(
                    circumcenterX, circumcenterY, circumradiusScaled * 0.7,
                    circumcenterX, circumcenterY, circumradiusScaled
                );
                circumGradient.addColorStop(0, 'rgba(168, 85, 247, 0)');
                circumGradient.addColorStop(1, 'rgba(168, 85, 247, 0.08)');
                ctx.beginPath();
                ctx.arc(circumcenterX, circumcenterY, circumradiusScaled, 0, Math.PI * 2);
                ctx.fillStyle = circumGradient;
                ctx.fill();
                ctx.globalAlpha = 1;

                // Tashqi aylana chizish (yuqoridan sweep bilan aylanib chiziladi)
                ctx.beginPath();
                ctx.arc(circumcenterX, circumcenterY, circumradiusScaled, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ccProg);
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([]);
                ctx.stroke();

                // Circumcenter nuqtasi (boshidayoq tez paydo bo'ladi)
                ctx.globalAlpha = clamp01(ccProg * 2);
                ctx.beginPath();
                ctx.arc(circumcenterX, circumcenterY, 6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(circumcenterX, circumcenterY, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#a855f7';
                ctx.fill();
                ctx.globalAlpha = 1;

                // Radius chizig'i (markazdan A cho'qqisiga)
                // Animatsiya: aylana yarmidan oshgach markazdan o'sib chiqadi
                const ccrProg = clamp01((ccProg - 0.45) / 0.45);
                if (ccrProg > 0) {
                    ctx.beginPath();
                    ctx.moveTo(circumcenterX, circumcenterY);
                    ctx.lineTo(circumcenterX + (ax - circumcenterX) * ccrProg, circumcenterY + (ay - circumcenterY) * ccrProg);
                    ctx.strokeStyle = '#a855f7';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([3, 3]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // Yozuvlar animatsiya oxirida paydo bo'ladi
                ctx.globalAlpha = clamp01((ccProg - 0.75) / 0.25);

                // Radius label
                const rLabelMidX = (circumcenterX + ax) / 2;
                const rLabelMidY = (circumcenterY + ay) / 2;

                // Radius chizig'iga perpendikulyar yo'nalish
                const rdx = ax - circumcenterX;
                const rdy = ay - circumcenterY;
                const rLen = Math.sqrt(rdx * rdx + rdy * rdy);

                if (rLen > 1) {
                    let rOffsetX = -rdy / rLen * 18;
                    let rOffsetY = rdx / rLen * 18;

                    // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                    const testX = rLabelMidX + rOffsetX;
                    const testY = rLabelMidY + rOffsetY;
                    const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                    const distFromMid = Math.sqrt((rLabelMidX - centroidX) ** 2 + (rLabelMidY - centroidY) ** 2);

                    if (distToCentroid < distFromMid) {
                        rOffsetX = -rOffsetX;
                        rOffsetY = -rOffsetY;
                    }

                    ctx.font = 'bold 11px Inter, sans-serif';
                    const cRPos = placeLabel(rLabelMidX + rOffsetX, rLabelMidY + rOffsetY, 24, 20, rOffsetX, rOffsetY);
                    ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(cRPos.x - 12, cRPos.y - 10, 24, 20, 4);
                    ctx.fill();
                    ctx.strokeStyle = '#a855f7';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.fillStyle = '#a855f7';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('R', cRPos.x, cRPos.y);
                }

                // Circumcenter label - centroiddan teskari yo'nalishda
                let oOffsetX = 15;
                let oOffsetY = 15;

                // Circumcenterdan centroidga yo'nalish
                const toCentroidX = centroidX - circumcenterX;
                const toCentroidY = centroidY - circumcenterY;
                const toCentroidLen = Math.sqrt(toCentroidX * toCentroidX + toCentroidY * toCentroidY);

                if (toCentroidLen > 1) {
                    // Centroiddan teskari yo'nalishda label qo'yish
                    oOffsetX = -toCentroidX / toCentroidLen * 20;
                    oOffsetY = -toCentroidY / toCentroidLen * 20;
                }

                ctx.font = 'bold 11px Inter, sans-serif';
                const oPos = placeLabel(circumcenterX + oOffsetX, circumcenterY + oOffsetY, 20, 20, oOffsetX, oOffsetY);
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(oPos.x - 10, oPos.y - 10, 20, 20, 4);
                ctx.fill();
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#a855f7';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('O', oPos.x, oPos.y);
                ctx.restore();
            }
        }

        // Gipotenuza (to'g'ri burchakli uchburchak uchun)
        if (anim.hypotenuse > 0.001) {
            // Uchburchak markazini hisoblash (centroid) - label joylashuvi uchun
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            // To'g'ri burchak bor-yo'qligini tekshirish
            const isRightA = Math.abs(angleA - 90) < 1;
            const isRightB = Math.abs(angleB - 90) < 1;
            const isRightC = Math.abs(angleC - 90) < 1;
            const isRightTriangle = isRightA || isRightB || isRightC;

            if (isRightTriangle) {
                // Gipotenuza - to'g'ri burchakka qarama-qarshi tomon (eng uzun tomon)
                let hypPoints, hypLabel, leg1, leg2, rightAnglePoint;

                if (isRightA) {
                    // A = 90°, gipotenuza = a (B va C orasida)
                    hypPoints = [points[1], points[2]];
                    hypLabel = 'a';
                    leg1 = 'b';
                    leg2 = 'c';
                    rightAnglePoint = points[0];
                } else if (isRightB) {
                    // B = 90°, gipotenuza = b (A va C orasida)
                    hypPoints = [points[0], points[2]];
                    hypLabel = 'b';
                    leg1 = 'a';
                    leg2 = 'c';
                    rightAnglePoint = points[1];
                } else {
                    // C = 90°, gipotenuza = c (A va B orasida)
                    hypPoints = [points[0], points[1]];
                    hypLabel = 'c';
                    leg1 = 'a';
                    leg2 = 'b';
                    rightAnglePoint = points[2];
                }

                // Animatsiya: chiziq bir uchidan ikkinchisiga o'sib chiqadi
                const hypProg = anim.hypotenuse;
                const lineProg = clamp01(hypProg / 0.6);
                const hypEndX = hypPoints[0].x + (hypPoints[1].x - hypPoints[0].x) * lineProg;
                const hypEndY = hypPoints[0].y + (hypPoints[1].y - hypPoints[0].y) * lineProg;
                ctx.save();

                // Gipotenuza chizig'ini ajratib ko'rsatish
                ctx.beginPath();
                ctx.moveTo(hypPoints[0].x, hypPoints[0].y);
                ctx.lineTo(hypEndX, hypEndY);
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Gipotenuza ustida yaltiroq effekt
                ctx.globalAlpha = hypProg;
                ctx.beginPath();
                ctx.moveTo(hypPoints[0].x, hypPoints[0].y);
                ctx.lineTo(hypEndX, hypEndY);
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
                ctx.lineWidth = 12;
                ctx.stroke();

                // 90° belgisi chiziq chizilgach paydo bo'ladi
                ctx.globalAlpha = clamp01((hypProg - 0.5) / 0.3);

                // To'g'ri burchak belgisi (90° uchun kvadrat)
                const sqSize = 15;
                const prev = hypPoints[0];
                const next = hypPoints[1];

                // Ikki tomon yo'nalishlari
                const dir1x = (prev.x - rightAnglePoint.x);
                const dir1y = (prev.y - rightAnglePoint.y);
                const len1 = Math.sqrt(dir1x * dir1x + dir1y * dir1y);
                const norm1x = dir1x / len1 * sqSize;
                const norm1y = dir1y / len1 * sqSize;

                const dir2x = (next.x - rightAnglePoint.x);
                const dir2y = (next.y - rightAnglePoint.y);
                const len2 = Math.sqrt(dir2x * dir2x + dir2y * dir2y);
                const norm2x = dir2x / len2 * sqSize;
                const norm2y = dir2y / len2 * sqSize;

                ctx.beginPath();
                ctx.moveTo(rightAnglePoint.x + norm1x, rightAnglePoint.y + norm1y);
                ctx.lineTo(rightAnglePoint.x + norm1x + norm2x, rightAnglePoint.y + norm1y + norm2y);
                ctx.lineTo(rightAnglePoint.x + norm2x, rightAnglePoint.y + norm2y);
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Pifagor labeli animatsiya oxirida paydo bo'ladi
                ctx.globalAlpha = clamp01((hypProg - 0.65) / 0.35);

                // Pifagor teoremasi labeli
                const midX = (hypPoints[0].x + hypPoints[1].x) / 2;
                const midY = (hypPoints[0].y + hypPoints[1].y) / 2;

                const dx = hypPoints[1].x - hypPoints[0].x;
                const dy = hypPoints[1].y - hypPoints[0].y;
                const len = Math.sqrt(dx * dx + dy * dy);
                let offsetX = -dy / len * 35;
                let offsetY = dx / len * 35;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalish
                const testX = midX + offsetX;
                const testY = midY + offsetY;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromMid = Math.sqrt((midX - centroidX) ** 2 + (midY - centroidY) ** 2);

                if (distToCentroid < distFromMid) {
                    offsetX = -offsetX;
                    offsetY = -offsetY;
                }

                const pythagorasText = `${hypLabel}² = ${leg1}² + ${leg2}²`;
                ctx.font = 'bold 12px Inter, sans-serif';
                const textWidth = ctx.measureText(pythagorasText).width + 16;
                const pyPos = placeLabel(midX + offsetX, midY + offsetY, textWidth, 28, offsetX, offsetY);

                ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
                ctx.beginPath();
                ctx.roundRect(pyPos.x - textWidth / 2, pyPos.y - 14, textWidth, 28, 6);
                ctx.fill();
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#f43f5e';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pythagorasText, pyPos.x, pyPos.y);
                ctx.restore();
            } else {
                // To'g'ri burchakli emas - ogohlantirish (fade-in)
                ctx.save();
                ctx.globalAlpha = anim.hypotenuse;
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
                ctx.beginPath();
                ctx.roundRect(20, 20, 200, 30, 6);
                ctx.fill();
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#f43f5e';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚠ To\'g\'ri burchakli emas!', 30, 35);
                ctx.restore();
            }
        }

        // Tomonlar uzunligi
        if (anim.sides > 0.001) {
            // Uchburchak markazini hisoblash (centroid)
            const centroidX = (points[0].x + points[1].x + points[2].x) / 3;
            const centroidY = (points[0].y + points[1].y + points[2].y) / 3;

            const sides = [
                { p1: 1, p2: 2, label: `a = ${a}${unitSuffix}`, color: '#ef4444' },
                { p1: 0, p2: 2, label: `b = ${b}${unitSuffix}`, color: '#f59e0b' },
                { p1: 0, p2: 1, label: `c = ${c}${unitSuffix}`, color: '#10b981' }
            ];

            sides.forEach((side, sIdx) => {
                // Animatsiya: yozuvlar birin-ketin fade bilan chiqadi
                const prog = stagger(anim.sides, sIdx);
                if (prog <= 0) return;
                ctx.save();
                ctx.globalAlpha = prog;

                const midX = (points[side.p1].x + points[side.p2].x) / 2;
                const midY = (points[side.p1].y + points[side.p2].y) / 2;

                // Offset perpendicular to the side
                const dx = points[side.p2].x - points[side.p1].x;
                const dy = points[side.p2].y - points[side.p1].y;
                const len = Math.sqrt(dx * dx + dy * dy);
                let nx = -dy / len * 25;
                let ny = dx / len * 25;

                // Offset yo'nalishini tekshirish - centroidga qarab bo'lsa, teskari yo'nalishga o'zgartirish
                // Bu orqali label har doim uchburchak tashqarisida bo'ladi
                const testX = midX + nx;
                const testY = midY + ny;
                const distToCentroid = Math.sqrt((testX - centroidX) ** 2 + (testY - centroidY) ** 2);
                const distFromMid = Math.sqrt((midX - centroidX) ** 2 + (midY - centroidY) ** 2);

                // Agar offset centroidga yaqinroq bo'lsa, teskari yo'nalishga o'zgartirish
                if (distToCentroid < distFromMid) {
                    nx = -nx;
                    ny = -ny;
                }

                // Background (to'qnashuvsiz joylashtirish)
                ctx.font = 'bold 12px Inter, sans-serif';
                const textWidth = ctx.measureText(side.label).width + 16;
                const sPos = placeLabel(midX + nx, midY + ny, textWidth, 24, nx, ny);
                const tx = sPos.x, ty = sPos.y;
                ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
                ctx.beginPath();
                ctx.roundRect(tx - textWidth / 2, ty - 12, textWidth, 24, 6);
                ctx.fill();
                ctx.strokeStyle = side.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = side.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(side.label, tx, ty);
                ctx.restore();
            });
        }
}

// ===== Ko'rinish elementlari uchun ikki yo'nalishli animatsiya hook'i =====
// ON: progress 0 -> 1 (850ms), OFF: 1 -> 0 (600ms). Yarim yo'lda almashtirish silliq davom etadi.
function useFeatureAnimation(flags) {
    const [animProgress, setAnimProgress] = useState(() => {
        const init = {};
        Object.keys(flags).forEach(k => { init[k] = flags[k] ? 1 : 0; });
        return init;
    });
    const progressRef = useRef(null);
    progressRef.current = animProgress;
    const prevFlagsRef = useRef(null);
    const animFramesRef = useRef({});

    // Har renderda flaglarni solishtiramiz — o'zgargan kalit uchun animatsiya boshlaymiz
    useEffect(() => {
        if (!prevFlagsRef.current) {
            prevFlagsRef.current = { ...flags };
            return;
        }
        Object.entries(flags).forEach(([key, value]) => {
            const wasOn = prevFlagsRef.current[key];
            prevFlagsRef.current[key] = value;
            if (wasOn === value) return;

            // ON → 1 ga o'sadi, OFF → 0 ga qaytadi (teskari animatsiya)
            if (animFramesRef.current[key]) cancelAnimationFrame(animFramesRef.current[key]);
            const from = progressRef.current[key];
            const to = value ? 1 : 0;
            if (from === to) return;
            // Yarim yo'lda almashtirilsa, qolgan masofaga proporsional davomiylik
            const duration = (value ? 850 : 600) * Math.abs(to - from);
            const start = performance.now();

            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
                setAnimProgress(p => ({ ...p, [key]: from + (to - from) * eased }));
                if (t < 1) animFramesRef.current[key] = requestAnimationFrame(step);
            };
            animFramesRef.current[key] = requestAnimationFrame(step);
        });
    });

    useEffect(() => () => {
        Object.values(animFramesRef.current).forEach(id => cancelAnimationFrame(id));
    }, []);

    return animProgress;
}

// Professional Fullscreen Triangle Whiteboard
function FullscreenTriangleWhiteboard({ sideA, sideB, sideC, unitSymbol, onClose, onSizeChange, viewFlags, onToggleView, onClearView }) {
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const containerRef = useRef(null);

    // Ko'rinish elementlari animatsiyasi (asosiy sahifa bilan bir xil tizim)
    const anim = useFeatureAnimation(viewFlags);
    const [isViewPanelOpen, setIsViewPanelOpen] = useState(false);

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [activeTool, setActiveTool] = useState('view');
    const [drawings, setDrawings] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#ffffff');
    const [penSize, setPenSize] = useState(3);
    const [lastPinchDistance, setLastPinchDistance] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [eraserSize, setEraserSize] = useState(20);
    const [draggingVertex, setDraggingVertex] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '' });

    useEffect(() => {
        const updateSize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const triangleData = useMemo(() => {
        if (!sideA || !sideB || !sideC) return null;
        
        const cWidth = canvasSize.width;
        const cHeight = canvasSize.height;
        const centerX = cWidth / 2;
        const centerY = cHeight / 2;
        
        // Calculate triangle coordinates using side lengths
        const a = sideA, b = sideB, c = sideC;
        const maxSide = Math.max(a, b, c);
        const triScale = Math.min(cWidth * 0.4, cHeight * 0.4) / maxSide;
        
        const aScaled = a * triScale;
        const bScaled = b * triScale;
        const cScaled = c * triScale;
        
        // Place A at bottom-left, B at bottom-right, C at top
        const Ax = centerX - cScaled / 2;
        const Ay = centerY + cHeight * 0.2;
        const Bx = centerX + cScaled / 2;
        const By = centerY + cHeight * 0.2;
        
        // Calculate C position using law of cosines
        const cosA = (bScaled * bScaled + cScaled * cScaled - aScaled * aScaled) / (2 * bScaled * cScaled);
        // Math.max(0, ...) — tomonlar uchburchak tengsizligini buzsa, ildiz ostidagi
        // qiymat manfiy bo'lib NaN qaytaradi va shakl butunlay yo'qoladi. Shuni oldini olamiz.
        const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
        const Cx = Ax + bScaled * cosA;
        const Cy = Ay - bScaled * sinA;

        // Burchaklar (kosinuslar teoremasi) - ko'rinish elementlari uchun
        const toDeg = (v) => Math.acos(Math.max(-1, Math.min(1, v))) * 180 / Math.PI;
        const angleA = toDeg((b * b + c * c - a * a) / (2 * b * c));
        const angleB = toDeg((a * a + c * c - b * b) / (2 * a * c));
        const angleC = 180 - angleA - angleB;

        return {
            points: [
                { x: Ax, y: Ay, label: 'A', angle: angleA },
                { x: Bx, y: By, label: 'B', angle: angleB },
                { x: Cx, y: Cy, label: 'C', angle: angleC }
            ],
            angles: { angleA, angleB, angleC },
            triScale
        };
    }, [sideA, sideB, sideC, canvasSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cWidth = canvas.width;
        const cHeight = canvas.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, cWidth, cHeight);
        ctx.save();
        ctx.translate(cWidth / 2, cHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);

        // Grid (fade animatsiya bilan)
        if (anim.grid > 0.001) {
            ctx.save();
            ctx.globalAlpha = anim.grid;
            const gridSize = 40;
            ctx.strokeStyle = '#1a1a24';
            ctx.lineWidth = 0.5 / scale;
            for (let x = 0; x < cWidth * 2; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x - cWidth / 2, -cHeight);
                ctx.lineTo(x - cWidth / 2, cHeight * 2);
                ctx.stroke();
            }
            for (let y = 0; y < cHeight * 2; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(-cWidth, y - cHeight / 2);
                ctx.lineTo(cWidth * 2, y - cHeight / 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (triangleData) {
            const { points } = triangleData;

            ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
            ctx.shadowBlur = 40 / scale;

            const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
            gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.3)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.35)');

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 4 / scale;
            ctx.stroke();

            // Cho'qqi yozuvlari (A, B, C) joylashuvini oldindan band qilamiz
            const vertexSeedRects = points.map((point, i) => {
                let lx = point.x, ly = point.y;
                if (i === 0) { lx -= 40 / scale; ly += 30 / scale; }
                else if (i === 1) { lx += 40 / scale; ly += 30 / scale; }
                else { ly -= 30 / scale; }
                return { x: lx - 22 / scale, y: ly - 22 / scale, w: 44 / scale, h: 44 / scale };
            });

            // Barcha ko'rinish elementlari (asosiy sahifa bilan bir xil, animatsiya bilan)
            drawTriangleFeatures(ctx, points, {
                a: sideA, b: sideB, c: sideC,
                angleA: triangleData.angles.angleA,
                angleB: triangleData.angles.angleB,
                angleC: triangleData.angles.angleC,
                anim,
                unitSuffix: ` ${unitSymbol}`,
                seedRects: vertexSeedRects
            });

            // Labels
            points.forEach((point, i) => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 18 / scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 12 / scale, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.primary;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();

                let lx = point.x, ly = point.y;
                if (i === 0) { lx -= 40 / scale; ly += 30 / scale; }
                else if (i === 1) { lx += 40 / scale; ly += 30 / scale; }
                else { ly -= 30 / scale; }

                ctx.fillStyle = 'rgba(23, 23, 31, 0.95)';
                ctx.beginPath();
                ctx.roundRect(lx - 20 / scale, ly - 20 / scale, 40 / scale, 40 / scale, 8 / scale);
                ctx.fill();
                ctx.strokeStyle = COLORS.primary;
                ctx.lineWidth = 2 / scale;
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = `bold ${18 / scale}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(point.label, lx, ly);
            });

        }
        ctx.restore();
    }, [scale, offset, sideA, sideB, sideC, canvasSize, triangleData, unitSymbol, anim]);

    // Drawing canvas
    useEffect(() => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cWidth = canvas.width;
        const cHeight = canvas.height;

        ctx.clearRect(0, 0, cWidth, cHeight);

        // Draw paths
        drawings.forEach(d => {
            if (d.points.length < 2) return;
            ctx.save();
            ctx.translate(cWidth / 2, cHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);
            
            ctx.globalCompositeOperation = d.isEraser ? 'destination-out' : 'source-over';
            ctx.strokeStyle = d.isEraser ? 'rgba(0,0,0,1)' : d.color;
            ctx.lineWidth = d.size / scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(d.points[0].x, d.points[0].y);
            d.points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        });

        if (currentPath.length > 1) {
            ctx.save();
            ctx.translate(cWidth / 2, cHeight / 2);
            ctx.scale(scale, scale);
            ctx.translate(-cWidth / 2 + offset.x, -cHeight / 2 + offset.y);
            
            ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
            ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : penColor;
            ctx.lineWidth = (activeTool === 'eraser' ? eraserSize : penSize) / scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
        }
    }, [drawings, currentPath, scale, offset, penColor, penSize, eraserSize, activeTool, canvasSize]);

    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches?.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        else { clientX = e.clientX; clientY = e.clientY; }
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return {
            x: (x - canvas.width / 2) / scale + canvas.width / 2 - offset.x,
            y: (y - canvas.height / 2) / scale + canvas.height / 2 - offset.y
        };
    };

    const getClientCoords = (e) => {
        if (e.touches?.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    };

    const getPinchDistance = (e) => {
        if (e.touches?.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        return null;
    };

    const handleMouseDown = (e) => {
        if (activeTool === 'pen' || activeTool === 'eraser') {
            setIsDrawing(true);
            setCurrentPath([getCanvasCoords(e)]);
        } else if (activeTool === 'view') {
            const coords = getCanvasCoords(e);

            if (isLocked && triangleData) {
                const hitRadius = 20 / scale;
                const clickedVertexIndex = triangleData.points.findIndex(p => {
                    const dist = Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2);
                    return dist <= hitRadius;
                });

                if (clickedVertexIndex !== -1) {
                    setDraggingVertex(clickedVertexIndex);
                }
            } else if (!isLocked) {
                setIsDragging(true);
                const client = getClientCoords(e);
                setDragStart({ x: client.x - offset.x, y: client.y - offset.y });
            }
        }
    };

    const handleMouseMove = (e) => {
        const coords = getCanvasCoords(e);

        if (isDrawing && (activeTool === 'pen' || activeTool === 'eraser')) {
            setCurrentPath(prev => [...prev, coords]);
        } else if (draggingVertex !== null && triangleData && onSizeChange) {
            const ts = triangleData.triScale;
            const p = triangleData.points;

            const p0 = draggingVertex === 0 ? coords : p[0]; // A
            const p1 = draggingVertex === 1 ? coords : p[1]; // B
            const p2 = draggingVertex === 2 ? coords : p[2]; // C

            const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / ts;

            // Triangle sides: a=BC, b=AC, c=AB
            const newC = Math.round(dist(p0, p1) * 10) / 10; // AB
            const newB = Math.round(dist(p0, p2) * 10) / 10; // AC
            const newA = Math.round(dist(p1, p2) * 10) / 10; // BC

            if (newA < 0.5 || newA > 50 || newB < 0.5 || newB > 50 || newC < 0.5 || newC > 50) {
                return;
            }

            // Uchburchak tengsizligi: har bir tomon qolgan ikki tomon yig'indisidan
            // kichik bo'lishi shart. Aks holda uchburchak hosil bo'lmaydi va shakl
            // yo'qolib qoladi. Chegaraga yetganda o'zgarishni qo'llamaymiz —
            // shakl oxirgi to'g'ri uchburchak holatida TO'XTAYDI (yo'qolmaydi).
            const triMargin = 0.1;
            if (
                newA + newB <= newC + triMargin ||
                newB + newC <= newA + triMargin ||
                newA + newC <= newB + triMargin
            ) {
                return;
            }

            onSizeChange({ sideA: newA, sideB: newB, sideC: newC });
        } else if (isDragging && !isLocked) {
            const client = getClientCoords(e);
            setOffset({ x: client.x - dragStart.x, y: client.y - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && currentPath.length > 1) {
            setDrawings(prev => [...prev, { 
                points: currentPath, 
                color: penColor, 
                size: activeTool === 'eraser' ? eraserSize : penSize,
                isEraser: activeTool === 'eraser'
            }]);
        }
        setIsDrawing(false);
        setDraggingVertex(null);
        setCurrentPath([]);
        setIsDragging(false);
        setLastPinchDistance(null);
    };

    const handleTouchStart = (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            setLastPinchDistance(getPinchDistance(e));
            return;
        }
        handleMouseDown(e);
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 2 && !isLocked) {
            const distance = getPinchDistance(e);
            if (lastPinchDistance && distance) {
                setScale(s => Math.max(0.3, Math.min(5, s * (distance / lastPinchDistance))));
                setLastPinchDistance(distance);
            }
            return;
        }
        handleMouseMove(e);
    };

    const handleWheel = (e) => {
        if (isLocked) return;
        e.preventDefault();
        setScale(s => Math.max(0.3, Math.min(5, s * (e.deltaY > 0 ? 0.9 : 1.1))));
    };

    return (
        <div className="fullscreen-whiteboard" ref={containerRef}>
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="whiteboard-main-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: activeTool === 'pen' || activeTool === 'eraser' ? (activeTool === 'eraser' ? 'cell' : 'crosshair') : (isDragging ? 'grabbing' : 'grab'), touchAction: 'none' }}
            />
            <canvas
                ref={drawingCanvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="whiteboard-drawing-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                onWheel={handleWheel}
                style={{ 
                    position: 'absolute', top: 0, left: 0, zIndex: 10,
                    pointerEvents: (activeTool === 'pen' || activeTool === 'eraser') ? 'auto' : 'none',
                    cursor: activeTool === 'eraser' ? 'cell' : 'crosshair',
                    touchAction: 'none'
                }}
            />

            <button className={`toolbar-toggle-btn ${isToolbarOpen ? 'open' : ''}`} onClick={() => setIsToolbarOpen(!isToolbarOpen)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isToolbarOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>}
                </svg>
            </button>

            <div className={`whiteboard-toolbar ${isToolbarOpen ? 'open' : ''}`}>
                <div className="toolbar-section tools-row">
                    <button className={`toolbar-btn ${activeTool === 'view' ? 'active' : ''}`} onClick={() => setActiveTool('view')} title="Ko'rish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    <button className={`toolbar-btn ${activeTool === 'pen' ? 'active' : ''}`} onClick={() => setActiveTool('pen')} title="Qalam">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></svg>
                    </button>
                    <button className={`toolbar-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="O'chirgich">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" /><line x1="17" y1="17" x2="11" y2="11" /></svg>
                    </button>
                    <button className={`toolbar-btn ${isLocked ? 'active locked' : ''}`} onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Qulfni ochish" : "Qulflash"}>
                        {isLocked ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                        )}
                    </button>
                </div>
                <div className="toolbar-divider" />
                <div className="toolbar-section zoom-section">
                    <button className="toolbar-btn" onClick={() => setScale(s => Math.min(5, s * 1.2))} title="Yaqinlashtirish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <span className="zoom-level">{Math.round(scale * 100)}%</span>
                    <button className="toolbar-btn" onClick={() => setScale(s => Math.max(0.3, s * 0.8))} title="Uzoqlashtirish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <button className="toolbar-btn" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} title="Qayta o'rnatish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>
                </div>
                <div className="toolbar-divider" />
                <div className="toolbar-section color-section">
                    <div className="color-palette">
                        {COLOR_PALETTE.map(color => (
                            <button key={color} className={`color-btn ${penColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => setPenColor(color)} />
                        ))}
                    </div>
                </div>
                <div className="toolbar-divider" />
                <div className="toolbar-section size-section">
                    <span className="size-label">{activeTool === 'eraser' ? "O'chirgich:" : "Qalinlik:"}</span>
                    <input type="range" min="1" max="50" value={activeTool === 'eraser' ? eraserSize : penSize} onChange={(e) => activeTool === 'eraser' ? setEraserSize(parseInt(e.target.value)) : setPenSize(parseInt(e.target.value))} className="size-slider" />
                    <span className="size-value">{activeTool === 'eraser' ? eraserSize : penSize}px</span>
                </div>
                <div className="toolbar-divider" />
                <div className="whiteboard-actions">
                    <button className="whiteboard-action-btn clear-btn" onClick={() => setDrawings([])} title="Faqat chizilganlarni tozalash">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                    <button className="whiteboard-action-btn clear-all-btn" onClick={() => { setDrawings([]); onClearView(); }} title="Hammasini o'chirish (chizmalar + barcha ko'rinish elementlari)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>
                    </button>
                </div>
            </div>

            {/* Ko'rinish paneli tugmasi */}
            <button className={`wb-view-toggle-btn ${isViewPanelOpen ? 'open' : ''}`} onClick={() => setIsViewPanelOpen(!isViewPanelOpen)} title="Ko'rinish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                <span className="wb-view-toggle-badge">{Object.values(viewFlags).filter(Boolean).length}</span>
            </button>

            {/* Ko'rinish paneli (ASOSIY + QO'SHIMCHA) */}
            {isViewPanelOpen && (
                <div className="wb-view-panel">
                    <div className="wb-view-header">
                        <span>👁 Ko'rinish</span>
                        <span className="wb-view-badge">{Object.values(viewFlags).filter(Boolean).length}/10</span>
                    </div>
                    <div className="wb-view-section-title">◣ ASOSIY</div>
                    <div className="wb-view-grid">
                        {[
                            { key: 'grid', label: 'Grid', icon: '⊞' },
                            { key: 'angles', label: 'Burchaklar', icon: '∠' },
                            { key: 'sides', label: 'Tomonlar', icon: '—' },
                            { key: 'height', label: 'Balandlik', icon: '↕' }
                        ].map(item => (
                            <button key={item.key} className={`wb-view-item ${viewFlags[item.key] ? 'active' : ''}`} onClick={() => onToggleView(item.key)}>
                                <span className="wb-view-icon">{item.icon}</span>
                                <span className="wb-view-label">{item.label}</span>
                                <span className={`wb-view-status ${viewFlags[item.key] ? 'on' : 'off'}`}>{viewFlags[item.key] ? 'ON' : 'OFF'}</span>
                            </button>
                        ))}
                    </div>
                    <div className="wb-view-section-title">✨ QO'SHIMCHA</div>
                    <div className="wb-view-grid">
                        {[
                            { key: 'external', label: 'Tashqi burchak', icon: '↗' },
                            { key: 'median', label: 'Median', icon: '⋯' },
                            { key: 'bisector', label: 'Bissektrisa', icon: '∠/' },
                            { key: 'incircle', label: 'Ichki aylana', icon: '◎' },
                            { key: 'circumcircle', label: 'Tashqi aylana', icon: '○' },
                            { key: 'hypotenuse', label: 'Gipotenuza', icon: '⌐' }
                        ].map(item => (
                            <button key={item.key} className={`wb-view-item ${viewFlags[item.key] ? 'active' : ''}`} onClick={() => onToggleView(item.key)}>
                                <span className="wb-view-icon">{item.icon}</span>
                                <span className="wb-view-label">{item.label}</span>
                                <span className={`wb-view-status ${viewFlags[item.key] ? 'on' : 'off'}`}>{viewFlags[item.key] ? 'ON' : 'OFF'}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Toast notification */}
            <div className={`toast-notification ${toast.show ? 'show' : ''}`}>
                <span className="toast-icon">⚠️</span>
                <span className="toast-message">{toast.message}</span>
            </div>

            {/* Lock Indicator */}
            {isLocked && (
                <div className="lock-indicator">
                    🔒 Qulflangan - cho'qqilarni torting
                </div>
            )}

            {/* Save Button */}

            <button className="whiteboard-close-btn" onClick={onClose} title="Yopish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" /></svg>
            </button>
        </div>
    );
}

// Yaxshilangan Canvas komponenti
function TriangleCanvas({ a, b, c, angleA, angleB, angleC, showGrid, showAngles, showSides, showHeight, showExternalAngles, showMedian, showBisector, showIncircle, showCircumcircle, showHypotenuse, isValid, onSizeChange, sideLimits }) {
    const canvasRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({ width: 700, height: 550 });
    // Cho'qqini sichqoncha bilan tortib uchburchak o'lchamini o'zgartirish (fullscreen emas)
    const [draggingVertex, setDraggingVertex] = useState(null);
    const [hoverVertex, setHoverVertex] = useState(false);
    // Drag paytidagi jonli holat (re-render kutmasdan, qotirilgan masshtab bilan)
    const dragRef = useRef(null);

    // Ko'rinish elementlari animatsiyasi (umumiy hook)
    const animProgress = useFeatureAnimation({
        grid: showGrid,
        angles: showAngles,
        sides: showSides,
        height: showHeight,
        external: showExternalAngles,
        median: showMedian,
        bisector: showBisector,
        incircle: showIncircle,
        circumcircle: showCircumcircle,
        hypotenuse: showHypotenuse
    });

    useEffect(() => {
        const updateSize = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                const parent = canvasRef.current.parentElement;
                setCanvasSize({ width: parent.clientWidth, height: parent.clientHeight });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Cho'qqi piksel koordinatalaridan tomon va burchaklarni hisoblash
    const sidesFromPoints = (pts, scale) => {
        const d = (m, n) => Math.sqrt((m.x - n.x) ** 2 + (m.y - n.y) ** 2) / scale;
        const c2 = Math.round(d(pts[0], pts[1]) * 10) / 10; // AB
        const b2 = Math.round(d(pts[0], pts[2]) * 10) / 10; // AC
        const a2 = Math.round(d(pts[1], pts[2]) * 10) / 10; // BC
        const toDeg = (v) => Math.acos(Math.max(-1, Math.min(1, v))) * 180 / Math.PI;
        const angA = toDeg((b2 * b2 + c2 * c2 - a2 * a2) / (2 * b2 * c2));
        const angB = toDeg((a2 * a2 + c2 * c2 - b2 * b2) / (2 * a2 * c2));
        const angC = 180 - angA - angB;
        return { a: a2, b: b2, c: c2, angleA: angA, angleB: angB, angleC: angC };
    };

    // Tomonlar bo'yicha markazlashtirilgan, ekranga moslashtirilgan cho'qqilar
    const computeFitted = (sa, sb, sc, angA, angB, angC, w, h) => {
        const centerX = w / 2;
        const centerY = h / 2 + 40;
        const maxSide = Math.max(sa, sb, sc);
        const scale = Math.min(w * 0.7, h * 0.6) / maxSide;
        const x1 = 0, y1 = 0;
        const x2 = sc * scale, y2 = 0;
        const aR = (angA * Math.PI) / 180;
        const x3 = sb * scale * Math.cos(aR);
        const y3 = -sb * scale * Math.sin(aR);
        const minX = Math.min(x1, x2, x3), maxX = Math.max(x1, x2, x3);
        const minY = Math.min(y1, y2, y3), maxY = Math.max(y1, y2, y3);
        const offX = centerX - (minX + maxX) / 2;
        const offY = centerY - (minY + maxY) / 2;
        return {
            scale, w, h,
            points: [
                { x: x1 + offX, y: y1 + offY, label: 'A', angle: angA },
                { x: x2 + offX, y: y2 + offY, label: 'B', angle: angB },
                { x: x3 + offX, y: y3 + offY, label: 'C', angle: angC }
            ]
        };
    };

    // Render manbasi — cho'qqilarning HAQIQIY piksel pozitsiyalari. Drag paytida
    // faqat tortilgan cho'qqi siljiydi; qolganlari va masshtab joyida qoladi, shuning
    // uchun na drag paytida, na qo'yib yuborilganda shakl sakramaydi. Faqat slayder
    // o'zgarganda yoki canvas o'lchami o'zgarganda qayta markazlashtiriladi.
    const [verts, setVerts] = useState(null);
    const vertsRef = useRef(null);
    vertsRef.current = verts;

    useEffect(() => {
        if (!isValid) { setVerts(null); return; }
        const cur = vertsRef.current;
        // Hozirgi pozitsiyalar shu tomonlarni va shu canvas o'lchamini aks ettirsa —
        // (ya'ni o'zgarish drag'dan kelgan bo'lsa) qayta moslashtirmaymiz.
        if (cur && cur.w === canvasSize.width && cur.h === canvasSize.height) {
            const s = sidesFromPoints(cur.points, cur.scale);
            if (s.a === a && s.b === b && s.c === c) return;
        }
        setVerts(computeFitted(a, b, c, angleA, angleB, angleC, canvasSize.width, canvasSize.height));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [a, b, c, angleA, angleB, angleC, isValid, canvasSize]);

    // Sahnani chizish — `points` (cho'qqilar) va `sides` (tomon/burchak qiymatlari)
    // tashqaridan beriladi, shu sababli ham oddiy render, ham drag paytidagi jonli
    // (imperativ) chizish bir xil koddan foydalanadi. Drag paytida masshtab qotirilgani
    // uchun shakl sakramaydi — boshqa cho'qqilar joyida turadi.
    const drawScene = (renderPoints, sides, highlightIdx = null) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvasSize.width;
        const height = canvasSize.height;

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Grid (fade animatsiya bilan yonadi/o'chadi)
        if (animProgress.grid > 0.001) {
            ctx.save();
            ctx.globalAlpha = animProgress.grid;
            const gridSize = 25;
            const offsetX = (width / 2) % gridSize;
            const offsetY = (height / 2) % gridSize;
            ctx.strokeStyle = '#1a1a24';
            ctx.lineWidth = 1;
            for (let x = offsetX; x < width; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let x = offsetX - gridSize; x >= 0; x -= gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = offsetY; y < height; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }
            for (let y = offsetY - gridSize; y >= 0; y -= gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }
            ctx.restore();
        }

        if (!isValid) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Uchburchak hosil bo\'lmaydi!', width / 2, height / 2 - 10);
            ctx.font = '14px Inter, sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText('Tomonlar nisbatini o\'zgartiring', width / 2, height / 2 + 20);
            return;
        }

        if (!renderPoints) return;
        const points = renderPoints;
        const sA = sides.a, sB = sides.b, sC = sides.c;

        // Shadow
        ctx.shadowColor = 'rgba(16, 185, 129, 0.3)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Gradient fill
        const gradient = ctx.createLinearGradient(
            points[0].x, points[2].y,
            points[1].x, points[0].y
        );
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.25)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Chiziqlari (glow effect)
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Cho'qqi yozuvlari (A, B, C) joylashuvini oldindan band qilamiz
        const vertexSeedRects = points.map((point, i) => {
            let lx = point.x, ly = point.y;
            if (i === 0) { lx -= 25; ly += 5; }
            else if (i === 1) { lx += 25; ly += 5; }
            else { ly -= 25; }
            return { x: lx - 14, y: ly - 14, w: 28, h: 28 };
        });

        // Barcha ko'rinish elementlarini chizish (umumiy funksiya, animatsiya bilan)
        drawTriangleFeatures(ctx, points, { a: sA, b: sB, c: sC, angleA: sides.angleA, angleB: sides.angleB, angleC: sides.angleC, anim: animProgress, seedRects: vertexSeedRects });

        // Nuqtalar
        points.forEach((point, i) => {
            const active = i === highlightIdx;
            // Outer glow — tortilayotgan cho'qqi kattaroq va yorqinroq
            ctx.beginPath();
            ctx.arc(point.x, point.y, active ? 18 : 12, 0, Math.PI * 2);
            ctx.fillStyle = active ? 'rgba(16, 185, 129, 0.55)' : 'rgba(16, 185, 129, 0.3)';
            ctx.fill();

            // Inner circle
            ctx.beginPath();
            ctx.arc(point.x, point.y, active ? 9 : 7, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.primary;
            ctx.fill();

            // White center
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            // Label
            const labelOffset = 25;
            let lx = point.x;
            let ly = point.y;

            if (i === 0) { lx -= labelOffset; ly += 5; }
            else if (i === 1) { lx += labelOffset; ly += 5; }
            else { ly -= labelOffset; }

            // Label background
            ctx.fillStyle = 'rgba(23, 23, 31, 0.9)';
            ctx.beginPath();
            ctx.roundRect(lx - 12, ly - 12, 24, 24, 6);
            ctx.fill();
            ctx.strokeStyle = COLORS.primary;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(point.label, lx, ly);
        });
    };

    useEffect(() => {
        // Drag davom etayotgan bo'lsa qotirilgan (jonli) cho'qqilardan, aks holda
        // saqlangan pozitsiyalardan (verts) chizamiz.
        const drag = dragRef.current;
        if (drag) {
            drawScene(drag.points, drag.sides, drag.idx);
        } else {
            drawScene(verts?.points, { a, b, c, angleA, angleB, angleC });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [a, b, c, angleA, angleB, angleC, showGrid, showAngles, showSides, showHeight, showExternalAngles, showMedian, showBisector, showIncircle, showCircumcircle, showHypotenuse, isValid, canvasSize, animProgress, verts]);

    // Sichqoncha koordinatasini canvas piksel koordinatasiga o'tkazish
    // (canvas CSS bilan cho'zilishi mumkin, shuning uchun masshtabni hisobga olamiz)
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const src = e.touches?.length > 0 ? e.touches[0] : e;
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
    };

    const findVertexAt = (coords) => {
        const v = vertsRef.current;
        if (!v) return -1;
        const hitRadius = 24;
        return v.points.findIndex(p =>
            Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2) <= hitRadius
        );
    };

    const handleMouseDown = (e) => {
        if (!onSizeChange) return;
        const v = vertsRef.current;
        if (!v) return;
        const idx = findVertexAt(getCanvasCoords(e));
        if (idx === -1) return;
        // Drag boshlandi: masshtab va boshqa cho'qqilar qotiriladi — shu sababli
        // tortilganda shakl sakramaydi (faqat tanlangan cho'qqi kursorga ergashadi).
        const base = v.points.map(p => ({ ...p }));
        dragRef.current = {
            idx,
            scale: v.scale,
            base,
            points: base.map(p => ({ ...p })),
            sides: { a, b, c, angleA, angleB, angleC }
        };
        setDraggingVertex(idx);
    };

    const handleMouseMove = (e) => {
        if (!vertsRef.current) return;
        const coords = getCanvasCoords(e);
        const drag = dragRef.current;

        if (!drag) {
            // Drag yo'q — faqat kursor ko'rinishi uchun hover tekshiruvi
            if (onSizeChange) setHoverVertex(findVertexAt(coords) !== -1);
            return;
        }

        // Tanlangan cho'qqi kursorga ergashadi, qolgan ikkitasi joyida qoladi
        const pts = drag.base.map(p => ({ ...p }));
        pts[drag.idx] = { ...pts[drag.idx], x: coords.x, y: coords.y };
        const sides = sidesFromPoints(pts, drag.scale);

        // Chegaradan tashqarida (juda kichik/katta) — kadrni qotiramiz, sakrash bo'lmaydi
        const lim = sideLimits || { min: 0.5, max: 100000 };
        if ([sides.a, sides.b, sides.c].some(v => v < lim.min || v > lim.max)) return;

        // Cho'qqi yozuvlari uchun burchaklarni yangilaymiz
        pts[0].angle = sides.angleA; pts[0].label = 'A';
        pts[1].angle = sides.angleB; pts[1].label = 'B';
        pts[2].angle = sides.angleC; pts[2].label = 'C';

        drag.points = pts;
        drag.sides = sides;

        // Darhol imperativ chizish — kursordan ortda qolmaslik (silliq, "pro" his)
        drawScene(pts, sides, drag.idx);
        // Saqlangan pozitsiyani ham yangilaymiz: shunda qo'yib yuborilganda shakl
        // o'sha joyida qoladi (qayta markazlashtirish/sakrash bo'lmaydi).
        setVerts({ scale: drag.scale, w: canvasSize.width, h: canvasSize.height, points: pts });
        // Panellarni yangilash
        onSizeChange({ sideA: sides.a, sideB: sides.b, sideC: sides.c });
    };

    const handleMouseUp = () => {
        if (!dragRef.current) return;
        dragRef.current = null;
        setHoverVertex(false);
        setDraggingVertex(null); // re-render → effect geometriyadan qayta chizadi
    };

    const handleTouchMove = (e) => {
        if (dragRef.current) e.preventDefault();
        handleMouseMove(e);
    };

    const interactive = !!onSizeChange;
    const cursor = draggingVertex !== null ? 'grabbing' : (hoverVertex ? 'grab' : 'default');

    return (
        <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="triangle-canvas"
            onMouseDown={interactive ? handleMouseDown : undefined}
            onMouseMove={interactive ? handleMouseMove : undefined}
            onMouseUp={interactive ? handleMouseUp : undefined}
            onMouseLeave={interactive ? handleMouseUp : undefined}
            onTouchStart={interactive ? handleMouseDown : undefined}
            onTouchMove={interactive ? handleTouchMove : undefined}
            onTouchEnd={interactive ? handleMouseUp : undefined}
            style={{ width: '100%', height: '100%', maxWidth: '100%', display: 'block', cursor, touchAction: interactive ? 'none' : 'auto' }}
        />
    );
}

export function UchburchakPage() {
    const [triangleType, setTriangleType] = useState('custom');
    const [sideA, setSideA] = useState(8);
    const [sideB, setSideB] = useState(6);
    const [sideC, setSideC] = useState(7);
    const [unit, setUnit] = useState('sm');

    const [showGrid, setShowGrid] = useState(true);
    const [showAngles, setShowAngles] = useState(true);
    const [showSides, setShowSides] = useState(true);
    const [showHeight, setShowHeight] = useState(true);
    const [showExternalAngles, setShowExternalAngles] = useState(false);
    const [showMedian, setShowMedian] = useState(false);
    const [showBisector, setShowBisector] = useState(false);
    const [showIncircle, setShowIncircle] = useState(false);
    const [showCircumcircle, setShowCircumcircle] = useState(false);
    const [showHypotenuse, setShowHypotenuse] = useState(false);
    const [resultModal, setResultModal] = useState(null);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenWhiteboard, setShowFullscreenWhiteboard] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);
    const [drawMode, setDrawMode] = useState(false);
    const [drawings, setDrawings] = useState([]);
    const [currentDrawing, setCurrentDrawing] = useState([]);
    const [drawColor, setDrawColor] = useState('#6366f1');
    const [drawSize, setDrawSize] = useState(3);
    const [eraserSize, setEraserSize] = useState(15);
    const [isErasing, setIsErasing] = useState(false);
    const [rotateSpeed, setRotateSpeed] = useState(2);
    const [eraserPosition, setEraserPosition] = useState(null);
    const fullscreenCanvasRef = useRef(null);
    
    // ESC key bilan yopish
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showFullscreenWhiteboard) {
                setShowFullscreenWhiteboard(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showFullscreenWhiteboard]);


    // Unit ga qarab slider limitleri
    const sliderLimits = useMemo(() => {
        switch (unit) {
            case 'mm': return { min: 10, max: 2000, step: 1 };
            case 'sm': return { min: 1, max: 200, step: 0.1 };
            case 'm': return { min: 0.01, max: 2, step: 0.01 };
            default: return { min: 1, max: 200, step: 0.1 };
        }
    }, [unit]);

    // Unit konversiya koeffitsientlari (sm ga nisbatan)
    const unitToSm = { mm: 0.1, sm: 1, m: 100 };

    // Unit o'zgarganda - qiymatlarni konvertatsiya qilish
    const handleUnitChange = (newUnit) => {
        if (newUnit === unit) return;
        const ratio = UNITS[unit].factor / UNITS[newUnit].factor;
        setSideA(prev => Math.round(prev * ratio * 100) / 100);
        setSideB(prev => Math.round(prev * ratio * 100) / 100);
        setSideC(prev => Math.round(prev * ratio * 100) / 100);
        setUnit(newUnit);
    };


    // Uchburchak turiga qarab
    useEffect(() => {
        switch (triangleType) {
            case 'equilateral':
                setSideB(sideA);
                setSideC(sideA);
                break;
            case 'isosceles':
                setSideB(sideA);
                break;
            case 'right':
                setSideB(sideA * 0.75);
                setSideC(Math.sqrt(sideA * sideA + (sideA * 0.75) * (sideA * 0.75)));
                break;
            default:
                break;
        }
    }, [triangleType, sideA]);

    // Hisob-kitoblar
    const getRelativeCoords = (e) => {
        const container = fullscreenCanvasRef.current;
        if (!container) return { x: 0, y: 0 };
        const rect = container.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleDrawStart = (e) => {
        if (!drawMode) return;
        if (isErasing) { const coords = getRelativeCoords(e); setEraserPosition(coords); eraseAtPosition(coords); return; }
        const coords = getRelativeCoords(e); setCurrentDrawing([coords]);
    };

    const handleDrawMove = (e) => {
        if (!drawMode) return;
        if (isErasing) { const coords = getRelativeCoords(e); setEraserPosition(coords); eraseAtPosition(coords); return; }
        if (currentDrawing.length === 0) return;
        const coords = getRelativeCoords(e); setCurrentDrawing(prev => [...prev, coords]);
    };

    const handleDrawEnd = () => {
        if (!drawMode) return;
        if (isErasing) { setEraserPosition(null); return; }
        if (currentDrawing.length < 2) return;
        setDrawings(prev => [...prev, { points: currentDrawing, color: drawColor, size: drawSize }]);
        setCurrentDrawing([]);
    };

    const eraseAtPosition = (coords) => {
        const updatedDrawings = drawings.map(drawing => {
            const { points } = drawing; const newSegments = []; let currentSegment = [];
            for (let i = 0; i < points.length; i++) {
                const point = points[i]; const dx = point.x - coords.x; const dy = point.y - coords.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance >= eraserSize) { currentSegment.push(point); } else { if (currentSegment.length >= 2) { newSegments.push({ ...drawing, points: [...currentSegment] }); } currentSegment = []; }
            }
            if (currentSegment.length >= 2) { newSegments.push({ ...drawing, points: [...currentSegment] }); }
            return newSegments;
        }).flat();
        setDrawings(updatedDrawings);
    };

    const clearAllDrawings = () => { setDrawings([]); setCurrentDrawing([]); };
    const resetView = () => { };
    const calculations = useMemo(() => {
        const a = sideA;
        const b = sideB;
        const c = sideC;

        const perimeter = a + b + c;
        const s = perimeter / 2;
        const areaSquared = s * (s - a) * (s - b) * (s - c);
        const area = areaSquared > 0 ? Math.sqrt(areaSquared) : 0;

        const cosA = (b * b + c * c - a * a) / (2 * b * c);
        const cosB = (a * a + c * c - b * b) / (2 * a * c);
        const cosC = (a * a + b * b - c * c) / (2 * a * b);

        const angleA = Math.acos(Math.max(-1, Math.min(1, cosA))) * (180 / Math.PI);
        const angleB = Math.acos(Math.max(-1, Math.min(1, cosB))) * (180 / Math.PI);
        const angleC = Math.acos(Math.max(-1, Math.min(1, cosC))) * (180 / Math.PI);

        const ha = area > 0 ? (2 * area) / a : 0;
        const hb = area > 0 ? (2 * area) / b : 0;
        const hc = area > 0 ? (2 * area) / c : 0;

        const inradius = area > 0 ? area / s : 0;
        const circumradius = area > 0 ? (a * b * c) / (4 * area) : 0;

        let type = "";
        let typeIcon = "";

        if (Math.abs(a - b) < 0.01 && Math.abs(b - c) < 0.01) {
            type = "Teng tomonli";
            typeIcon = "△";
        } else if (Math.abs(a - b) < 0.01 || Math.abs(b - c) < 0.01 || Math.abs(a - c) < 0.01) {
            type = "Teng yonli";
            typeIcon = "▲";
        } else {
            type = "Turli tomonli";
            typeIcon = "◺";
        }

        const maxAngle = Math.max(angleA, angleB, angleC);
        if (Math.abs(maxAngle - 90) < 0.5) {
            type += " • To'g'ri burchakli";
            typeIcon = "◢";
        } else if (maxAngle > 90) {
            type += " • O'tmas burchakli";
        } else {
            type += " • O'tkir burchakli";
        }

        return {
            perimeter: perimeter.toFixed(2),
            s: s.toFixed(2),
            area: area.toFixed(2),
            angleA: angleA.toFixed(1),
            angleB: angleB.toFixed(1),
            angleC: angleC.toFixed(1),
            cosA: cosA.toFixed(4),
            cosB: cosB.toFixed(4),
            cosC: cosC.toFixed(4),
            ha: ha.toFixed(2),
            hb: hb.toFixed(2),
            hc: hc.toFixed(2),
            inradius: inradius.toFixed(2),
            circumradius: circumradius.toFixed(2),
            type,
            typeIcon,
            isValid: areaSquared > 0
        };
    }, [sideA, sideB, sideC]);

    const unitSymbol = UNITS[unit].symbol;
    const isValidTriangle = calculations.isValid;

    // Tomonlar o'zgarishi natijasida uchburchak yo'q bo'lib qolmasligi uchun chegaralarni hisoblaymiz
    let minA = 1, maxA = 13;
    let minB = 1, maxB = 13;
    let minC = 1, maxC = 13;

    if (triangleType === 'custom' || triangleType === 'scalene') {
        minA = Math.max(1, Math.abs(sideB - sideC) + 0.1);
        maxA = Math.min(13, sideB + sideC - 0.1);
        minB = Math.max(1, Math.abs(sideA - sideC) + 0.1);
        maxB = Math.min(13, sideA + sideC - 0.1);
        minC = Math.max(1, Math.abs(sideA - sideB) + 0.1);
        maxC = Math.min(13, sideA + sideB - 0.1);
    } else if (triangleType === 'isosceles') {
        minA = Math.max(1, sideC / 2 + 0.1);
        minB = minA;
        maxA = 13;
        maxB = 13;
    }

    // Yaxlitlash (float masalalari oldini olish uchun)
    minA = Math.ceil(minA * 10) / 10; maxA = Math.floor(maxA * 10) / 10;
    minB = Math.ceil(minB * 10) / 10; maxB = Math.floor(maxB * 10) / 10;
    minC = Math.ceil(minC * 10) / 10; maxC = Math.floor(maxC * 10) / 10;

    return (
        <div className="shape-page uchburchak-page">
            {/* Header - PRO Format */}
            <header className="shape-page-header pro-page-header pro-header-enhanced">
                {/* Left Section - Back Button & Logo & Title */}
                <div className="header-left-section">
                    <Link to="/2d-models" className="back-btn" title="2D shakllarga qaytish">
                        ← Orqaga
                    </Link>
                    <Link to="/" className="header-logo-link" title="Bosh sahifa">
                        <img src="/logo.png" alt="Logo" className="header-logo-img" />
                    </Link>
                    <div className="header-divider"></div>
                    <div className="pro-page-header-content">
                        <div className="pro-header-icon">
                            <span className="icon-glow">△</span>
                        </div>
                        <div className="pro-header-text">
                            <h1>Uchburchak</h1>
                            <p>Interaktiv modellashtirish va hisoblash</p>
                        </div>
                    </div>
                </div>


                {/* Right Section - Actions */}
                <div className="header-right-section">
                    {/* User Menu */}
                    <UserMenu />
                </div>
            </header>


            <div className="shape-page-content">
                {/* Chap Panel - PRO Dizayn (Natijalar bilan bir xil) */}
                <aside className="params-panel pro-params-panel pro-settings-panel">
                    {/* Premium Header */}
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon">
                                <span className="icon-glow">⚙️</span>
                            </div>
                            <div className="pro-header-text">
                                <h2>Sozlamalar</h2>
                            </div>
                        </div>
                    </div>

                    {/* PRO Sections Container */}
                    <div className="pro-sections-container">

                        {/* ═══════════════════════════════════════════ */}
                        {/* O'LCHOV BIRLIGI BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section settings-unit-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchov birligi</span>
                                <span className="pro-section-badge">{UNITS[unit].symbol}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-unit-grid">
                                    {Object.entries(UNITS).map(([key, value]) => (
                                        <button
                                            key={key}
                                            className={`pro-settings-btn ${unit === key ? 'active' : ''}`}
                                            onClick={() => handleUnitChange(key)}
                                        >
                                            <span className="settings-btn-icon">{value.symbol}</span>
                                            <span className="settings-btn-label">{value.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* UCHBURCHAK TURI BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section settings-type-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">🔺</div>
                                <span className="pro-section-title">Uchburchak turi</span>
                                <span className="pro-section-badge">{TRIANGLE_TYPES[triangleType].icon}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-type-grid-settings">
                                    {Object.entries(TRIANGLE_TYPES).map(([key, value]) => (
                                        <button
                                            key={key}
                                            className={`pro-settings-btn type-btn ${triangleType === key ? 'active' : ''}`}
                                            onClick={() => setTriangleType(key)}
                                            title={value.name}
                                        >
                                            <span className="settings-btn-icon large">{value.icon}</span>
                                            <span className="settings-btn-label">{value.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* TOMONLAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section settings-sides-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📐</div>
                                <span className="pro-section-title">Tomonlar</span>
                                <span className="pro-section-badge">{triangleType === 'custom' || triangleType === 'scalene' ? '3 ta' : '1 ta'}</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-sides-container">
                                    {/* Tomon A */}
                                    <div className="pro-side-item">
                                        <div className="pro-side-header">
                                            <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>a</div>
                                            <div className="pro-side-info">
                                                <span className="pro-side-label">A tomon</span>
                                                <span className="pro-side-desc">BC qarshi</span>
                                            </div>
                                        </div>
                                        <div className="pro-side-controls">
                                            <input
                                                type="range"
                                                min={minA}
                                                max={maxA}
                                                step="0.1"
                                                value={sideA}
                                                onChange={(e) => setSideA(parseFloat(e.target.value))}
                                                className="pro-range"
                                                style={{ '--range-color': '#ef4444' }}
                                            />
                                        </div>
                                    </div>

                                    {(triangleType === 'custom' || triangleType === 'scalene') && (
                                        <>
                                            {/* Tomon B */}
                                            <div className="pro-side-item">
                                                <div className="pro-side-header">
                                                    <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>b</div>
                                                    <div className="pro-side-info">
                                                        <span className="pro-side-label">B tomon</span>
                                                        <span className="pro-side-desc">AC qarshi</span>
                                                    </div>
                                                </div>
                                                <div className="pro-side-controls">
                                                    <input
                                                        type="range"
                                                        min={minB}
                                                        max={maxB}
                                                        step="0.1"
                                                        value={sideB}
                                                        onChange={(e) => setSideB(parseFloat(e.target.value))}
                                                        className="pro-range"
                                                        style={{ '--range-color': '#f59e0b' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Tomon C */}
                                            <div className="pro-side-item">
                                                <div className="pro-side-header">
                                                    <div className="pro-side-indicator" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>c</div>
                                                    <div className="pro-side-info">
                                                        <span className="pro-side-label">C tomon</span>
                                                        <span className="pro-side-desc">AB qarshi</span>
                                                    </div>
                                                </div>
                                                <div className="pro-side-controls">
                                                    <input
                                                        type="range"
                                                        min={minC}
                                                        max={maxC}
                                                        step="0.1"
                                                        value={sideC}
                                                        onChange={(e) => setSideC(parseFloat(e.target.value))}
                                                        className="pro-range"
                                                        style={{ '--range-color': '#10b981' }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {!isValidTriangle && (
                                        <div className="pro-error-box">
                                            <div className="error-icon-wrap">⚠️</div>
                                            <div className="error-text">
                                                <strong>Uchburchak hosil bo'lmaydi!</strong>
                                                <p>Ikki tomon yig'indisi uchinchisidan katta bo'lishi kerak</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* KO'RINISH BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section settings-view-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">👁️</div>
                                <span className="pro-section-title">Ko'rinish</span>
                                <span className="pro-section-badge">{[showGrid, showAngles, showSides, showHeight, showExternalAngles, showMedian, showBisector, showIncircle, showCircumcircle, showHypotenuse].filter(Boolean).length}/10</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                {/* Asosiy elementlar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📐 Asosiy</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button
                                            className={`pro-toggle-item ${showGrid ? 'active' : ''}`}
                                            onClick={() => setShowGrid(!showGrid)}
                                        >
                                            <span className="toggle-icon">⊞</span>
                                            <span className="toggle-label">Grid</span>
                                            <span className={`toggle-status ${showGrid ? 'on' : 'off'}`}>{showGrid ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showAngles ? 'active' : ''}`}
                                            onClick={() => setShowAngles(!showAngles)}
                                        >
                                            <span className="toggle-icon">∠</span>
                                            <span className="toggle-label">Burchaklar</span>
                                            <span className={`toggle-status ${showAngles ? 'on' : 'off'}`}>{showAngles ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showSides ? 'active' : ''}`}
                                            onClick={() => setShowSides(!showSides)}
                                        >
                                            <span className="toggle-icon">—</span>
                                            <span className="toggle-label">Tomonlar</span>
                                            <span className={`toggle-status ${showSides ? 'on' : 'off'}`}>{showSides ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showHeight ? 'active' : ''}`}
                                            onClick={() => setShowHeight(!showHeight)}
                                        >
                                            <span className="toggle-icon">↕</span>
                                            <span className="toggle-label">Balandlik</span>
                                            <span className={`toggle-status ${showHeight ? 'on' : 'off'}`}>{showHeight ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Qo'shimcha elementlar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">✨ Qo'shimcha</h4>
                                    <div className="pro-toggle-grid-settings">
                                        <button
                                            className={`pro-toggle-item ${showExternalAngles ? 'active' : ''}`}
                                            onClick={() => setShowExternalAngles(!showExternalAngles)}
                                        >
                                            <span className="toggle-icon">↗</span>
                                            <span className="toggle-label">Tashqi burchak</span>
                                            <span className={`toggle-status ${showExternalAngles ? 'on' : 'off'}`}>{showExternalAngles ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showMedian ? 'active' : ''}`}
                                            onClick={() => setShowMedian(!showMedian)}
                                        >
                                            <span className="toggle-icon">⋯</span>
                                            <span className="toggle-label">Median</span>
                                            <span className={`toggle-status ${showMedian ? 'on' : 'off'}`}>{showMedian ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showBisector ? 'active' : ''}`}
                                            onClick={() => setShowBisector(!showBisector)}
                                        >
                                            <span className="toggle-icon">∠/</span>
                                            <span className="toggle-label">Bissektrisa</span>
                                            <span className={`toggle-status ${showBisector ? 'on' : 'off'}`}>{showBisector ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showIncircle ? 'active' : ''}`}
                                            onClick={() => setShowIncircle(!showIncircle)}
                                        >
                                            <span className="toggle-icon">◎</span>
                                            <span className="toggle-label">Ichki aylana</span>
                                            <span className={`toggle-status ${showIncircle ? 'on' : 'off'}`}>{showIncircle ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showCircumcircle ? 'active' : ''}`}
                                            onClick={() => setShowCircumcircle(!showCircumcircle)}
                                        >
                                            <span className="toggle-icon">◯</span>
                                            <span className="toggle-label">Tashqi aylana</span>
                                            <span className={`toggle-status ${showCircumcircle ? 'on' : 'off'}`}>{showCircumcircle ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <button
                                            className={`pro-toggle-item ${showHypotenuse ? 'active' : ''}`}
                                            onClick={() => setShowHypotenuse(!showHypotenuse)}
                                        >
                                            <span className="toggle-icon">┘</span>
                                            <span className="toggle-label">Gipotenuza</span>
                                            <span className={`toggle-status ${showHypotenuse ? 'on' : 'off'}`}>{showHypotenuse ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>

                    </div>
                </aside>

                <section className="canvas-panel" style={{ position: 'relative' }}>
                    <TriangleCanvas
                        a={sideA}
                        b={sideB}
                        c={sideC}
                        angleA={parseFloat(calculations.angleA)}
                        angleB={parseFloat(calculations.angleB)}
                        angleC={parseFloat(calculations.angleC)}
                        showGrid={showGrid}
                        showAngles={showAngles}
                        showSides={showSides}
                        showHeight={showHeight}
                        showExternalAngles={showExternalAngles}
                        showMedian={showMedian}
                        showBisector={showBisector}
                        showIncircle={showIncircle}
                        showCircumcircle={showCircumcircle}
                        showHypotenuse={showHypotenuse}
                        isValid={isValidTriangle}
                        sideLimits={sliderLimits}
                        onSizeChange={({ sideA: na, sideB: nb, sideC: nc }) => {
                            const { min, max } = sliderLimits;
                            const clamp = (v) => Math.max(min, Math.min(max, v));
                            // Cho'qqini tortganda uchburchak ixtiyoriy bo'ladi
                            if (triangleType !== 'custom') setTriangleType('custom');
                            setSideA(clamp(na));
                            setSideB(clamp(nb));
                            setSideC(clamp(nc));
                        }}
                    />

                    {isValidTriangle && (
                        <>
                            <div className="shape-type-badge">
                                <span className="badge-icon">{calculations.typeIcon}</span>
                                {calculations.type}
                            </div>
                            <button className="fullscreen-toggle-btn" onClick={() => setShowFullscreenWhiteboard(true)} title="To'liq ekran">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                            </button>
                        </>
                    )}
                </section>

                {/* O'ng Panel - Professional Results */}
                <aside className="formulas-panel pro-results-panel" style={{ minWidth: '340px' }}>
                    {/* Header */}
                    <div className="pro-results-header">
                        <div className="pro-header-content">
                            <div className="pro-header-icon">
                                <span className="icon-glow">📊</span>
                            </div>
                            <div className="pro-header-text">
                                <h2>Natijalar</h2>
                            </div>
                        </div>
                    </div>

                    {/* Asosiy natijalar - Premium Cards */}
                    <div className="pro-main-results">
                        <div className="pro-result-card area-card" onClick={() => setResultModal('area')} style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 22 20 2 20" />
                                </svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Yuzasi</span>
                                <span className="pro-card-value">{calculations.area}</span>
                                <span className="pro-card-unit">{unitSymbol}²</span>
                            </div>
                            <div className="pro-card-formula">S = √(p(p-a)(p-b)(p-c))</div>
                        </div>

                        <div className="pro-result-card perimeter-card" onClick={() => setResultModal('perimeter')} style={{ cursor: 'pointer' }}>
                            <div className="pro-card-glow"></div>
                            <div className="pro-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M2 12h20M12 2v20" />
                                </svg>
                            </div>
                            <div className="pro-card-content">
                                <span className="pro-card-label">Perimetri</span>
                                <span className="pro-card-value">{calculations.perimeter}</span>
                                <span className="pro-card-unit">{unitSymbol}</span>
                            </div>
                            <div className="pro-card-formula">P = a + b + c</div>
                        </div>
                    </div>

                    {/* Collapsible Sections Container */}
                    <div className="pro-sections-container">

                        {/* ═══════════════════════════════════════════ */}
                        {/* BURCHAKLAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section angles-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">∠</div>
                                <span className="pro-section-title">Burchaklar</span>
                                <span className="pro-section-badge">{(parseFloat(calculations.angleA) + parseFloat(calculations.angleB) + parseFloat(calculations.angleC)).toFixed(0)}°</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                {/* Ichki burchaklar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">📍 Ichki burchaklar</h4>
                                    <div className="pro-angle-grid">
                                        <div className="pro-angle-item" onClick={() => setResultModal('angleA')} style={{ cursor: 'pointer' }}>
                                            <div className="pro-angle-vertex">A</div>
                                            <div className="pro-angle-value">{calculations.angleA}°</div>
                                            <div className="pro-angle-bar" style={{ width: `${parseFloat(calculations.angleA) / 1.8}%` }}></div>
                                        </div>
                                        <div className="pro-angle-item" onClick={() => setResultModal('angleB')} style={{ cursor: 'pointer' }}>
                                            <div className="pro-angle-vertex">B</div>
                                            <div className="pro-angle-value">{calculations.angleB}°</div>
                                            <div className="pro-angle-bar" style={{ width: `${parseFloat(calculations.angleB) / 1.8}%` }}></div>
                                        </div>
                                        <div className="pro-angle-item" onClick={() => setResultModal('angleC')} style={{ cursor: 'pointer' }}>
                                            <div className="pro-angle-vertex">C</div>
                                            <div className="pro-angle-value">{calculations.angleC}°</div>
                                            <div className="pro-angle-bar" style={{ width: `${parseFloat(calculations.angleC) / 1.8}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="pro-sum-info">
                                        Σ = {(parseFloat(calculations.angleA) + parseFloat(calculations.angleB) + parseFloat(calculations.angleC)).toFixed(1)}° = 180°
                                    </div>
                                </div>

                                {/* Tashqi burchaklar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">↗ Tashqi burchaklar</h4>
                                    <div className="pro-external-angles">
                                        <div className="pro-ext-angle" onClick={() => setResultModal('extAngleA')} style={{ cursor: 'pointer' }}>
                                            <span className="ext-label">A'</span>
                                            <span className="ext-value">{(180 - parseFloat(calculations.angleA)).toFixed(1)}°</span>
                                            <span className="ext-formula">= B + C</span>
                                        </div>
                                        <div className="pro-ext-angle" onClick={() => setResultModal('extAngleB')} style={{ cursor: 'pointer' }}>
                                            <span className="ext-label">B'</span>
                                            <span className="ext-value">{(180 - parseFloat(calculations.angleB)).toFixed(1)}°</span>
                                            <span className="ext-formula">= A + C</span>
                                        </div>
                                        <div className="pro-ext-angle" onClick={() => setResultModal('extAngleC')} style={{ cursor: 'pointer' }}>
                                            <span className="ext-label">C'</span>
                                            <span className="ext-value">{(180 - parseFloat(calculations.angleC)).toFixed(1)}°</span>
                                            <span className="ext-formula">= A + B</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Uchburchak turi */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">🔺 Uchburchak turi</h4>
                                    <div className="pro-type-cards">
                                        <button className={`pro-type-btn ${parseFloat(calculations.angleA) < 90 && parseFloat(calculations.angleB) < 90 && parseFloat(calculations.angleC) < 90 ? 'active' : ''}`}>
                                            <span className="type-symbol">◿</span>
                                            <span className="type-name">O'tkir</span>
                                        </button>
                                        <button className={`pro-type-btn ${Math.abs(parseFloat(calculations.angleA) - 90) < 0.5 || Math.abs(parseFloat(calculations.angleB) - 90) < 0.5 || Math.abs(parseFloat(calculations.angleC) - 90) < 0.5 ? 'active' : ''}`}>
                                            <span className="type-symbol">◢</span>
                                            <span className="type-name">To'g'ri</span>
                                        </button>
                                        <button className={`pro-type-btn ${parseFloat(calculations.angleA) > 90 || parseFloat(calculations.angleB) > 90 || parseFloat(calculations.angleC) > 90 ? 'active' : ''}`}>
                                            <span className="type-symbol">◺</span>
                                            <span className="type-name">O'tmas</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* O'LCHOVLAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section measurements-section" open>
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📏</div>
                                <span className="pro-section-title">O'lchovlar</span>
                                <span className="pro-section-badge">5 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                {/* Balandliklar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">↕ Balandliklar</h4>
                                    <div className="pro-measurements-grid">
                                        <div className="pro-measure-item" onClick={() => setResultModal('heightA')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">hₐ</span>
                                            <span className="measure-value">{calculations.ha} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item" onClick={() => setResultModal('heightB')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">hᵦ</span>
                                            <span className="measure-value">{calculations.hb} {unitSymbol}</span>
                                        </div>
                                        <div className="pro-measure-item" onClick={() => setResultModal('heightC')} style={{ cursor: 'pointer' }}>
                                            <span className="measure-label">h꜀</span>
                                            <span className="measure-value">{calculations.hc} {unitSymbol}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Aylanalar */}
                                <div className="pro-subsection">
                                    <h4 className="pro-subsection-title">⭕ Aylana radiuslari</h4>
                                    <div className="pro-circles-grid">
                                        <div className="pro-circle-card incircle" onClick={() => setResultModal('inradius')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◎</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Ichki</span>
                                                <span className="circle-value">{calculations.inradius} {unitSymbol}</span>
                                            </div>
                                        </div>
                                        <div className="pro-circle-card circumcircle" onClick={() => setResultModal('circumradius')} style={{ cursor: 'pointer' }}>
                                            <div className="circle-visual">◯</div>
                                            <div className="circle-info">
                                                <span className="circle-name">Tashqi</span>
                                                <span className="circle-value">{calculations.circumradius} {unitSymbol}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* FORMULALAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <details className="pro-section formulas-section">
                            <summary className="pro-section-header">
                                <div className="pro-section-icon">📚</div>
                                <span className="pro-section-title">Formulalar</span>
                                <span className="pro-section-badge">7 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </summary>

                            <div className="pro-section-content">
                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📐 Yuza</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>S = √(p(p-a)(p-b)(p-c))</code><span>Geron</span></div>
                                        <div className="pro-formula-item"><code>S = ½ × a × h<sub>a</sub></code><span>Balandlik</span></div>
                                        <div className="pro-formula-item"><code>S = ½ × a × b × sin(C)</code><span>Sinus</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">📏 Tomon</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item highlight"><code>a² + b² = c²</code><span>Pifagor</span></div>
                                        <div className="pro-formula-item"><code>a² = b² + c² - 2bc×cos(A)</code><span>Kosinus</span></div>
                                    </div>
                                </div>

                                <div className="pro-formula-group">
                                    <div className="formula-group-title">⭕ Aylana</div>
                                    <div className="pro-formula-list">
                                        <div className="pro-formula-item"><code>r = S / p</code><span>Ichki</span></div>
                                        <div className="pro-formula-item"><code>R = abc / 4S</code><span>Tashqi</span></div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* ═══════════════════════════════════════════ */}
                        {/* QOIDALAR BO'LIMI */}
                        {/* ═══════════════════════════════════════════ */}
                        <div className="pro-section rules-section" onClick={() => setShowRulesModal(true)} style={{ cursor: 'pointer' }}>
                            <div className="pro-section-header">
                                <div className="pro-section-icon">📖</div>
                                <span className="pro-section-title">Qoidalar</span>
                                <span className="pro-section-badge">8 ta</span>
                                <svg className="pro-section-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </div>
                        </div>

                    </div>
                </aside>
            </div >

            {/* Result Details Modal */}
            {resultModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }} onClick={() => setResultModal(null)}>
                    <div style={{
                        backgroundColor: '#1e1e24',
                        padding: '30px',
                        borderRadius: '20px',
                        maxWidth: '600px',
                        width: '90%',
                        border: '1px solid #2a2a35',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setResultModal(null)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'transparent',
                                border: 'none',
                                color: '#9ca3af',
                                fontSize: '24px',
                                cursor: 'pointer',
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2a2a35'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                        >
                            ×
                        </button>

                        {resultModal === 'area' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>📐</span>
                                    Yuzasini hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>1. Yarim perimetrni topamiz (Geron):</div>
                                        <div>p = (a + b + c) / 2</div>
                                        <div style={{ color: '#10b981' }}>p = ({sideA} + {sideB} + {sideC}) / 2 = {calculations.s} {unitSymbol}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>2. Yuzani hisoblaymiz:</div>
                                        <div>S = √[p(p-a)(p-b)(p-c)]</div>
                                        <div style={{ marginTop: '10px' }}>
                                            S = √[{calculations.s} · ({calculations.s}-{sideA}) · ({calculations.s}-{sideB}) · ({calculations.s}-{sideC})]
                                        </div>
                                        <div style={{ marginTop: '5px' }}>
                                            S = √[{calculations.s} · {(calculations.s - sideA).toFixed(2)} · {(calculations.s - sideB).toFixed(2)} · {(calculations.s - sideC).toFixed(2)}]
                                        </div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                            S ≈ {calculations.area} {unitSymbol}²
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal === 'perimeter' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>📏</span>
                                    Perimetrni hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Barcha tomonlar yig'indisi:</div>
                                        <div>P = a + b + c</div>
                                        <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                                            P = {sideA} + {sideB} + {sideC} = {calculations.perimeter} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal.startsWith('angle') ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>∠</span>
                                    {resultModal === 'angleA' ? 'A' : resultModal === 'angleB' ? 'B' : 'C'} burchakni hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Kosinuslar teoremasi bo'yicha:</div>
                                        {resultModal === 'angleA' && (
                                            <>
                                                <div>a² = b² + c² - 2bc⋅cos(A)</div>
                                                <div style={{ marginTop: '5px', color: '#f59e0b' }}>
                                                    cos(A) = (b² + c² - a²) / 2bc
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'angleB' && (
                                            <>
                                                <div>b² = a² + c² - 2ac⋅cos(B)</div>
                                                <div style={{ marginTop: '5px', color: '#f59e0b' }}>
                                                    cos(B) = (a² + c² - b²) / 2ac
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'angleC' && (
                                            <>
                                                <div>c² = a² + b² - 2ab⋅cos(C)</div>
                                                <div style={{ marginTop: '5px', color: '#f59e0b' }}>
                                                    cos(C) = (a² + b² - c²) / 2ab
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Qiymatlarni qo'yamiz:</div>
                                        {resultModal === 'angleA' && (
                                            <>
                                                <div>cos(A) = ({sideB}² + {sideC}² - {sideA}²) / (2 · {sideB} · {sideC})</div>
                                                <div>cos(A) = ({Math.pow(sideB, 2).toFixed(2)} + {Math.pow(sideC, 2).toFixed(2)} - {Math.pow(sideA, 2).toFixed(2)}) / {(2 * sideB * sideC).toFixed(2)}</div>
                                                <div style={{ marginTop: '10px' }}>cos(A) ≈ {calculations.cosA}</div>
                                                <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                                                    A = arccos({calculations.cosA}) ≈ {calculations.angleA}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'angleB' && (
                                            <>
                                                <div>cos(B) = ({sideA}² + {sideC}² - {sideB}²) / (2 · {sideA} · {sideC})</div>
                                                <div>cos(B) = ({Math.pow(sideA, 2).toFixed(2)} + {Math.pow(sideC, 2).toFixed(2)} - {Math.pow(sideB, 2).toFixed(2)}) / {(2 * sideA * sideC).toFixed(2)}</div>
                                                <div style={{ marginTop: '10px' }}>cos(B) ≈ {calculations.cosB}</div>
                                                <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                                                    B = arccos({calculations.cosB}) ≈ {calculations.angleB}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'angleC' && (
                                            <>
                                                <div>cos(C) = ({sideA}² + {sideB}² - {sideC}²) / (2 · {sideA} · {sideB})</div>
                                                <div>cos(C) = ({Math.pow(sideA, 2).toFixed(2)} + {Math.pow(sideB, 2).toFixed(2)} - {Math.pow(sideC, 2).toFixed(2)}) / {(2 * sideA * sideB).toFixed(2)}</div>
                                                <div style={{ marginTop: '10px' }}>cos(C) ≈ {calculations.cosC}</div>
                                                <div style={{ marginTop: '15px', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                                                    C = arccos({calculations.cosC}) ≈ {calculations.angleC}°
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : resultModal.startsWith('extAngle') ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>↗</span>
                                    {resultModal === 'extAngleA' ? "A'" : resultModal === 'extAngleB' ? "B'" : "C'"} tashqi burchakni hisoblash
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>1-usul: Qo'shni burchak orqali</div>
                                        {resultModal === 'extAngleA' && (
                                            <>
                                                <div>A' = 180° - A</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    A' = 180° - {calculations.angleA}° = {(180 - parseFloat(calculations.angleA)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'extAngleB' && (
                                            <>
                                                <div>B' = 180° - B</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    B' = 180° - {calculations.angleB}° = {(180 - parseFloat(calculations.angleB)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'extAngleC' && (
                                            <>
                                                <div>C' = 180° - C</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    C' = 180° - {calculations.angleC}° = {(180 - parseFloat(calculations.angleC)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>2-usul: Ichki burchaklar yig'indisi orqali</div>
                                        {resultModal === 'extAngleA' && (
                                            <>
                                                <div>A' = B + C</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    A' = {calculations.angleB}° + {calculations.angleC}° = {(parseFloat(calculations.angleB) + parseFloat(calculations.angleC)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'extAngleB' && (
                                            <>
                                                <div>B' = A + C</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    B' = {calculations.angleA}° + {calculations.angleC}° = {(parseFloat(calculations.angleA) + parseFloat(calculations.angleC)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'extAngleC' && (
                                            <>
                                                <div>C' = A + B</div>
                                                <div style={{ marginTop: '5px', color: '#06b6d4' }}>
                                                    C' = {calculations.angleA}° + {calculations.angleB}° = {(parseFloat(calculations.angleA) + parseFloat(calculations.angleB)).toFixed(1)}°
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : resultModal === 'inradius' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>◎</span>
                                    Ichki chizilgan aylana radiusi
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>r = S / p</div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>(Yuza / Yarim perimetr)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>r = {calculations.area} / {calculations.s}</div>
                                        <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                            r ≈ {calculations.inradius} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal === 'circumradius' ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>◯</span>
                                    Tashqi chizilgan aylana radiusi
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>R = (a · b · c) / (4 · S)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        <div>R = ({sideA} · {sideB} · {sideC}) / (4 · {calculations.area})</div>
                                        <div>R = {(sideA * sideB * sideC).toFixed(2)} / {(4 * parseFloat(calculations.area)).toFixed(2)}</div>
                                        <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                                            R ≈ {calculations.circumradius} {unitSymbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : resultModal && resultModal.startsWith('height') ? (
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>↕</span>
                                    {resultModal === 'heightA' ? 'a' : resultModal === 'heightB' ? 'b' : 'c'} tomoniga tushirilgan balandlik
                                </h3>
                                <div style={{ background: '#13131a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '18px', lineHeight: '1.6', color: '#e2e8f0' }}>
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #2a2a35', paddingBottom: '15px' }}>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Formula:</div>
                                        <div>h = 2S / {resultModal === 'heightA' ? 'a' : resultModal === 'heightB' ? 'b' : 'c'}</div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>(2 · Yuza / Tomon)</div>
                                    </div>
                                    <div>
                                        <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '5px' }}>Hisoblash:</div>
                                        {resultModal === 'heightA' && (
                                            <>
                                                <div>hₐ = (2 · {calculations.area}) / {sideA}</div>
                                                <div>hₐ = {(2 * parseFloat(calculations.area)).toFixed(2)} / {sideA}</div>
                                                <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
                                                    hₐ ≈ {calculations.ha} {unitSymbol}
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'heightB' && (
                                            <>
                                                <div>hᵦ = (2 · {calculations.area}) / {sideB}</div>
                                                <div>hᵦ = {(2 * parseFloat(calculations.area)).toFixed(2)} / {sideB}</div>
                                                <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
                                                    hᵦ ≈ {calculations.hb} {unitSymbol}
                                                </div>
                                            </>
                                        )}
                                        {resultModal === 'heightC' && (
                                            <>
                                                <div>h_c = (2 · {calculations.area}) / {sideC}</div>
                                                <div>h_c = {(2 * parseFloat(calculations.area)).toFixed(2)} / {sideC}</div>
                                                <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
                                                    h_c ≈ {calculations.hc} {unitSymbol}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )
            }

            {/* Rules Modal */}
            {showRulesModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                }} onClick={() => setShowRulesModal(false)}>
                    <div style={{
                        backgroundColor: '#1e1e24',
                        padding: '30px',
                        borderRadius: '24px',
                        maxWidth: '700px',
                        width: '90%',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        border: '1px solid #2a2a35',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowRulesModal(false)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'transparent',
                                border: 'none',
                                color: '#9ca3af',
                                fontSize: '28px',
                                cursor: 'pointer',
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2a2a35'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                        >
                            ×
                        </button>

                        <h3 style={{ fontSize: '28px', marginBottom: '25px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '32px' }}>📖</span>
                            Uchburchak qoidalari
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { num: 1, title: 'Mavjudlik sharti', desc: 'Ikki tomon yig\'indisi uchinchidan katta bo\'lishi shart: a + b > c', color: '#10b981' },
                                { num: 2, title: 'Burchaklar yig\'indisi', desc: 'Ichki burchaklar yig\'indisi = 180°: ∠A + ∠B + ∠C = 180°', color: '#f59e0b' },
                                { num: 3, title: 'Tashqi burchak', desc: 'Tashqi burchak = Qarama-qarshi 2 ichki burchak yig\'indisi', color: '#06b6d4' },
                                { num: 4, title: 'Og\'irlik markazi (Centroid)', desc: 'Medianlar kesishuvi. Medianlarni 2:1 nisbatda bo\'ladi', color: '#8b5cf6' },
                                { num: 5, title: 'Incenter (Ichki markaz)', desc: 'Bissektrisalar kesishuvi. Ichki aylana markazi', color: '#ec4899' },
                                { num: 6, title: 'Circumcenter (Tashqi markaz)', desc: 'O\'rta perpendikulyarlar kesishuvi. Tashqi aylana markazi', color: '#3b82f6' },
                                { num: 7, title: 'Pifagor teoremasi', desc: 'To\'g\'ri burchakli uchburchakda: a² + b² = c² (c - gipotenuza)', color: '#ef4444' },
                                { num: 8, title: 'Ortocenter', desc: 'Balandliklar kesishuvi nuqtasi', color: '#6366f1' }
                            ].map(rule => (
                                <div key={rule.num} style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                    borderRadius: '12px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '16px',
                                    border: `1px solid ${rule.color}30`,
                                    transition: 'all 0.2s'
                                }}>
                                    <span style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: `linear-gradient(135deg, ${rule.color}40, ${rule.color}20)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '16px',
                                        color: rule.color,
                                        flexShrink: 0
                                    }}>{rule.num}</span>
                                    <div>
                                        <strong style={{ color: rule.color, fontSize: '16px', display: 'block', marginBottom: '4px' }}>{rule.title}</strong>
                                        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>{rule.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Whiteboard */}
            {showFullscreenWhiteboard && (
                <FullscreenTriangleWhiteboard
                    sideA={sideA}
                    sideB={sideB}
                    sideC={sideC}
                    unitSymbol={UNITS[unit].symbol}
                    onClose={() => setShowFullscreenWhiteboard(false)}
                    onSizeChange={({ sideA: newA, sideB: newB, sideC: newC }) => {
                        setSideA(Math.max(0.5, Math.min(50, newA)));
                        setSideB(Math.max(0.5, Math.min(50, newB)));
                        setSideC(Math.max(0.5, Math.min(50, newC)));
                    }}
                    viewFlags={{
                        grid: showGrid,
                        angles: showAngles,
                        sides: showSides,
                        height: showHeight,
                        external: showExternalAngles,
                        median: showMedian,
                        bisector: showBisector,
                        incircle: showIncircle,
                        circumcircle: showCircumcircle,
                        hypotenuse: showHypotenuse
                    }}
                    onToggleView={(key) => {
                        const setters = {
                            grid: setShowGrid,
                            angles: setShowAngles,
                            sides: setShowSides,
                            height: setShowHeight,
                            external: setShowExternalAngles,
                            median: setShowMedian,
                            bisector: setShowBisector,
                            incircle: setShowIncircle,
                            circumcircle: setShowCircumcircle,
                            hypotenuse: setShowHypotenuse
                        };
                        setters[key](v => !v);
                    }}
                    onClearView={() => {
                        [setShowGrid, setShowAngles, setShowSides, setShowHeight,
                            setShowExternalAngles, setShowMedian, setShowBisector,
                            setShowIncircle, setShowCircumcircle, setShowHypotenuse
                        ].forEach(set => set(false));
                    }}
                />
            )}

        </div >
    );
}

