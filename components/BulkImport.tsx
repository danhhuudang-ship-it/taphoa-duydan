'use client';
import { useState, useRef } from 'react';
import { Upload, X, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

type Row = {
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  description: string;
  category_name: string;
  // validation
  _ok: boolean;
  _err: string;
};

const TEMPLATE_HEADERS = ['SKU', 'Tên sản phẩm', 'Giá bán', 'Giá vốn', 'Tồn kho', 'Đơn vị', 'Danh mục', 'Mô tả'];
const SAMPLE_ROWS = [
  ['SP001', 'Coca-Cola lon 330ml',   12000,  9000,  50, 'lon',  'Đồ uống',         'Lon nước ngọt 330ml'],
  ['SP002', 'Mì gói Hảo Hảo',         5000,  3500, 100, 'gói',  'Đồ ăn nhanh',     ''],
  ['SP003', 'Bút bi Thiên Long',      8000,  5000,  30, 'cây',  'Văn phòng phẩm',  ''],
];

export default function BulkImport({
  open, onClose, categories, onImported,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onImported: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...SAMPLE_ROWS]);
    // Set column widths
    ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');
    XLSX.writeFile(wb, 'mau-nhap-san-pham.xlsx');
    toast.success('Đã tải file mẫu');
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

      const seen = new Set<string>();
      const parsed: Row[] = json.map((r: any) => {
        const sku = String(r['SKU'] || r['sku'] || '').trim();
        const name = String(r['Tên sản phẩm'] || r['Tên'] || r['name'] || '').trim();
        const price = Number(r['Giá bán'] || r['price'] || 0);
        const cost = Number(r['Giá vốn'] || r['cost'] || 0);
        const stock = Number(r['Tồn kho'] || r['stock'] || 0);
        const unit = String(r['Đơn vị'] || r['unit'] || 'cái').trim();
        const description = String(r['Mô tả'] || r['description'] || '').trim();
        const category_name = String(r['Danh mục'] || r['category'] || '').trim();

        let _err = '';
        if (!sku) _err = 'Thiếu SKU';
        else if (!name) _err = 'Thiếu tên SP';
        else if (price < 0) _err = 'Giá bán âm';
        else if (seen.has(sku)) _err = 'SKU trùng trong file';
        seen.add(sku);

        return {
          sku, name, price, cost, stock, unit, description, category_name,
          _ok: !_err, _err,
        };
      }).filter(r => r.sku || r.name); // bỏ dòng trống

      setRows(parsed);
      const okCount = parsed.filter(r => r._ok).length;
      const errCount = parsed.length - okCount;
      if (errCount > 0) toast(`✓ ${okCount} hợp lệ · ✗ ${errCount} lỗi`, { icon: '⚠️' });
      else toast.success(`✓ Đã đọc ${okCount} dòng hợp lệ`);
    } catch (e: any) {
      toast.error('Lỗi đọc file: ' + e.message);
    } finally {
      setParsing(false);
    }
  };

  const doImport = async () => {
    const valid = rows.filter(r => r._ok);
    if (!valid.length) return toast.error('Không có dòng hợp lệ');
    setImporting(true);
    setProgress({ done: 0, total: valid.length });

    const supabase = createClient();

    // Map category_name → category_id
    const catMap = new Map(categories.map(c => [c.name.toLowerCase().trim(), c.id]));

    // Auto-create new categories that appear in import but don't exist
    const newCatNames = new Set<string>();
    for (const r of valid) {
      const k = r.category_name.toLowerCase().trim();
      if (k && !catMap.has(k)) newCatNames.add(r.category_name.trim());
    }
    if (newCatNames.size > 0) {
      const { data: insertedCats } = await supabase
        .from('categories')
        .insert(Array.from(newCatNames).map(name => ({ name, icon: '📦', color: '#6366f1' })))
        .select();
      (insertedCats || []).forEach((c: any) => catMap.set(c.name.toLowerCase().trim(), c.id));
    }

    // Batch upsert in chunks of 50
    const CHUNK = 50;
    let done = 0;
    let success = 0;
    const errors: string[] = [];

    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK).map(r => ({
        sku: r.sku,
        name: r.name,
        price: r.price,
        cost: r.cost,
        stock: r.stock,
        unit: r.unit || 'cái',
        description: r.description || null,
        category_id: catMap.get(r.category_name.toLowerCase().trim()) || null,
        active: true,
      }));

      const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'sku' });

      if (error) {
        errors.push(`Lỗi batch ${i / CHUNK + 1}: ${error.message}`);
      } else {
        success += chunk.length;
      }
      done += chunk.length;
      setProgress({ done, total: valid.length });
    }

    setImporting(false);

    if (errors.length) {
      toast.error(`Nhập xong ${success}/${valid.length} - có lỗi: ${errors[0]}`);
    } else {
      toast.success(`✅ Đã nhập ${success} sản phẩm thành công`);
      setRows([]);
      onImported();
      onClose();
    }
  };

  if (!open) return null;

  const okCount = rows.filter(r => r._ok).length;
  const errCount = rows.length - okCount;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-3xl max-h-[92vh] md:max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl motion-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white relative">
          <div className="md:hidden mx-auto absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300" />
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-indigo-600" /> Nhập sản phẩm hàng loạt
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Tải file mẫu, điền thông tin rồi tải lên — SKU trùng sẽ được cập nhật</p>
          </div>
          <button onClick={onClose} className="size-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="size-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Step 1: Download template */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <div className="size-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Download className="size-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900">Bước 1: Tải file mẫu</div>
              <div className="text-xs text-slate-600">File Excel có sẵn 3 dòng ví dụ + đầy đủ cột chuẩn</div>
            </div>
            <button onClick={downloadTemplate} className="btn-ghost shrink-0">
              <Download className="size-4" /> Tải mẫu
            </button>
          </div>

          {/* Step 2: Upload */}
          <div>
            <div className="font-semibold text-slate-900 mb-2">Bước 2: Tải file lên (Excel hoặc CSV)</div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
              className={cn(
                'w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition',
                parsing ? 'border-indigo-300 bg-indigo-50 text-slate-500' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30'
              )}
            >
              {parsing ? (
                <>
                  <Loader2 className="size-6 animate-spin text-indigo-600" />
                  <span className="text-sm">Đang đọc file...</span>
                </>
              ) : (
                <>
                  <div className="size-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Upload className="size-5 text-indigo-600" />
                  </div>
                  <div className="font-semibold text-slate-900">Click để chọn file</div>
                  <div className="text-xs text-slate-500">.xlsx, .xls hoặc .csv</div>
                </>
              )}
            </button>
          </div>

          {/* Step 3: Preview */}
          {rows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="font-semibold text-slate-900">Bước 3: Kiểm tra & nhập</div>
                <span className="badge badge-success">{okCount} hợp lệ</span>
                {errCount > 0 && <span className="badge badge-danger">{errCount} lỗi</span>}
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500 w-8"></th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500">SKU</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500">Tên</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-slate-500">Giá</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-slate-500">Tồn</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-slate-500">Danh mục</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={cn(
                          'border-b border-slate-100',
                          !r._ok && 'bg-rose-50'
                        )}>
                          <td className="px-2 py-1.5">
                            {r._ok ? (
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            ) : (
                              <span title={r._err}><AlertCircle className="size-4 text-rose-500" /></span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-xs">{r.sku}</td>
                          <td className="px-2 py-1.5 truncate max-w-[180px]">{r.name}</td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap">{formatCurrency(r.price)}</td>
                          <td className="px-2 py-1.5 text-right">{r.stock}</td>
                          <td className="px-2 py-1.5 text-xs text-slate-500 truncate max-w-[140px]">{r.category_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {errCount > 0 && (
                <div className="text-xs text-rose-600 mt-2">
                  ⚠️ Các dòng đỏ sẽ bị bỏ qua. Hover vào icon ⓘ để xem lý do.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          {importing && (
            <div className="flex-1 text-xs text-slate-600">
              Đang nhập: <b>{progress.done}</b> / {progress.total}
              <div className="mt-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all"
                     style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
          {!importing && <div className="flex-1" />}
          <button onClick={onClose} className="btn-ghost">Đóng</button>
          <button
            onClick={doImport}
            disabled={!okCount || importing}
            className="btn-primary"
          >
            {importing ? <><Loader2 className="size-4 animate-spin" /> Đang nhập...</> : <>Nhập {okCount} sản phẩm</>}
          </button>
        </div>
      </div>
    </div>
  );
}
