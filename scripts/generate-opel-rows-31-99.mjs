#!/usr/bin/env node
import XLSX from "xlsx";
import fs from "node:fs";

const f = process.argv[2] || "/Users/vladislavufimcev/Desktop/топ 100 продаж опель.xlsx";
const wb = XLSX.readFile(f);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });

const BRANDS = [
  ["BOSCH", "Bosch"],
  ["HENGST", "Hengst"],
  ["FILTRON", "Filtron"],
  ["DELPHI", "Delphi"],
  ["ELRING", "Elring"],
  ["SKF", "SKF"],
  ["SIBTEK", "Sibtek"],
  ["IMS", "IMS"],
  ["VALEO", "Valeo"],
  ["FEBI", "Febi"],
  ["MANN", "Mann"],
  ["MAHLE", "Mahle"],
  ["LEMARK", "Lemark"],
  ["NGK", "NGK"],
  ["DENSO", "Denso"],
  ["TRW", "TRW"],
  ["SACHS", "Sachs"],
  ["LEMFÖRDER", "Lemförder"],
  ["LEMFORDER", "Lemförder"],
  ["GATES", "Gates"],
  ["DAYCO", "Dayco"],
  ["CONTINENTAL", "Continental"],
  ["INA", "INA"],
  ["FAG", "FAG"],
  ["SNR", "SNR"],
  ["OPTIMAL", "Optimal"],
  ["MEYLE", "Meyle"],
  ["RUVILLE", "Ruville"],
  ["SWAG", "Swag"],
  ["PIERBURG", "Pierburg"],
  ["VDO", "VDO"],
  ["HELLA", "Hella"],
  ["OSRAM", "Osram"],
  ["PHILIPS", "Philips"],
  ["BERU", "Beru"],
  ["CHAMPION", "Champion"],
  ["LYNX", "Lynx"],
  ["STELLOX", "Stellox"],
  ["SANGSIN", "Sangsin"],
  ["PATRON", "Patron"],
  ["MASUMA", "Masuma"],
];

function guessBrand(name) {
  const u = String(name).toUpperCase();
  if (/^BM\s/i.test(String(name).trim()) || u.includes(" BM ")) return "BM";
  for (const [needle, label] of BRANDS) {
    if (u.includes(needle)) return label;
  }
  if (/\bGM\b/i.test(name) || /\bDEXOS\b/i.test(name) || /\bDEXRON\b/i.test(name)) return "GM OE";
  return "—";
}

function guessCountry(brand) {
  if (brand === "GM OE") return "Европейский склад GM";
  if (
    [
      "Bosch",
      "Hengst",
      "Elring",
      "Febi",
      "Mann",
      "Mahle",
      "Hella",
      "Osram",
      "Philips",
      "Beru",
      "Continental",
      "INA",
      "FAG",
      "Pierburg",
      "VDO",
      "Lemförder",
    ].includes(brand)
  )
    return "Германия / ЕС";
  if (brand === "SKF") return "Швеция / ЕС";
  if (brand === "Delphi" || brand === "TRW") return "ЕС";
  if (brand === "Filtron") return "Польша";
  if (brand === "Sibtek" || brand === "Stellox" || brand === "BM") return "Китай / ЕС";
  if (brand === "IMS" || brand === "Patron" || brand === "Masuma") return "ЕС";
  if (brand === "NGK" || brand === "Denso") return "Япония / ЕС";
  if (brand === "Sangsin") return "Корея / ЕС";
  return "Уточняется";
}

function guessCategory(name) {
  const n = String(name).toLowerCase();
  if (n.includes("колодк")) return "Тормозная система";
  if (n.includes("свеч") || n.includes("модуль зажигания")) return "Свечи и зажигание";
  if (n.includes("ламп") || /\bh7\b/.test(n)) return "Автосвет и электрика";
  if (n.includes("салон") && n.includes("фильтр")) return "Салонные фильтры";
  if (n.includes("фильтр салон")) return "Салонные фильтры";
  if (n.includes("фильтр масл") || (n.includes("маслян") && n.includes("фильтр"))) return "Масляные фильтры";
  if (n.includes("воздушн") && n.includes("фильтр")) return "Воздушные фильтры";
  if (
    n.includes("стабилизатор") ||
    n.includes("опора стойки") ||
    n.includes("подшипник стойки") ||
    n.includes("шаровая") ||
    n.includes("сайлентблок") ||
    n.includes("втулка рулев")
  )
    return "Подвеска";
  if (
    n.includes("термостат") ||
    n.includes("корпус термостат") ||
    n.includes("бачок расшир") ||
    n.includes("тройник системы охлажд") ||
    n.includes("штуцер патрубка охлаждения турбины") ||
    n.includes("крышка бачка охл") ||
    n.includes("прокладка водяного насоса") ||
    (n.includes("помпа") && n.includes("водян")) ||
    (n.includes("шланг") && (n.includes("радиатор") || n.includes("охлажд"))) ||
    (n.includes("хомут") && n.includes("охлажд"))
  )
    return "Охлаждение";
  if (n.includes("пистон") || n.includes("клипс") || n.includes("дефлектор")) return "Кузов и крепёж";
  if (
    n.includes("прокладк") ||
    n.includes("сальник") ||
    n.includes("кольцо уплотнительн") ||
    (n.includes("уплотнитель") && n.includes("трубк"))
  )
    return "Прокладки, сальники и кольца";
  if (n.includes("жидкость") || n.includes("dexos") || n.includes("dexron")) return "Двигатель";
  if (
    n.includes("ремень приводной") ||
    n.includes("шестерня распредвала") ||
    n.includes("клапан положения распредвала") ||
    n.includes("клапан управления шестерни") ||
    n.includes("насос маслян") ||
    n.includes("маслонасос") ||
    n.includes("колпачёк маслосъём") ||
    n.includes("колпачек маслосъем") ||
    n.includes("патрубок дроссельн") ||
    n.includes("трубка обогрева дроссельн") ||
    n.includes("штифт шарнира кулисы")
  )
    return "Двигатель";
  return "Двигатель";
}

const PLACEHOLDER = "/images/catalog/_pending.jpg";
const blocks = [];

for (let i = 31; i <= 99; i++) {
  const r = rows[i];
  if (!r || r.length < 4) continue;
  const name = String(r[0] ?? "").trim();
  const sku = String(r[1] ?? "").trim();
  const qty = Number(r[2]);
  const priceRaw = Number(r[3]);
  if (!name || !sku) continue;
  const brand = guessBrand(name);
  const country = guessCountry(brand);
  const category = guessCategory(name);
  const car = "Opel / Chevrolet — уточняйте применение по VIN";
  const desc = `Позиция из выгрузки «топ 100 продаж Opel». Артикул ${sku}. Фотографию и расширенное описание можно добавить позже; перед заказом сверяйте совместимость по VIN или каталогу.`;
  const id = `opel-${i}`;
  blocks.push(`  {
    id: ${JSON.stringify(id)},
    name: ${JSON.stringify(name)},
    sku: ${JSON.stringify(sku)},
    qty: ${Math.floor(Number.isFinite(qty) ? qty : 0)},
    priceRaw: ${Number.isFinite(priceRaw) ? priceRaw : 0},
    brand: ${JSON.stringify(brand)},
    country: ${JSON.stringify(country)},
    category: ${JSON.stringify(category)},
    car: ${JSON.stringify(car)},
    image: ${JSON.stringify(PLACEHOLDER)},
    description:
      ${JSON.stringify(desc)},
  }`);
}

const out = process.argv[3] ? fs.createWriteStream(process.argv[3]) : process.stdout;
out.write(blocks.join(",\n"));
if (out !== process.stdout) out.end();
