declare module "luckyexcel" {
  type LuckyExport = {
    sheets?: Array<Record<string, unknown>>;
    info?: { name?: string; creator?: string };
  };

  type LuckyExcelApi = {
    transformExcelToLucky: (
      file: File | ArrayBuffer,
      callback: (exportJson: LuckyExport, luckysheetfile?: string) => void
    ) => void;
  };

  const LuckyExcel: LuckyExcelApi;
  export default LuckyExcel;
}
