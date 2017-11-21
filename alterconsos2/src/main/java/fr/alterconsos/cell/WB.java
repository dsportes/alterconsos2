package fr.alterconsos.cell;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Date;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;

import fr.hypertable.AppException;
import fr.hypertable.MF;

public class WB {
	OutputStream os;
	Workbook workbook;
	Sheet[] sheets;
	Row row;
	int[] irows;
	int maxCol = 0;
	CellStyle f1; 
	CellStyle f2;
	CellStyle f3;

	public WB(OutputStream os, String[] sheetNames) throws AppException {
		try {
			this.os = os;
			workbook = new HSSFWorkbook(); 
			// workbook = new XSSFWorkbook();
			sheets = new Sheet[sheetNames.length];
			irows = new int[sheetNames.length];
			for(int i = 0; i < sheetNames.length; i++) {
				sheets[i] = workbook.createSheet(sheetNames[i]);
				irows[i] = 0;
			}
			f1 = workbook.createCellStyle();
			f1.setDataFormat(workbook.createDataFormat().getFormat("0.00"));
			f2 = workbook.createCellStyle();
			f2.setDataFormat(workbook.createDataFormat().getFormat("0.000"));
			f3 = workbook.createCellStyle();
			f3.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd"));
		} catch (Exception e) {
			String s = e.toString();
			throw new AppException(MF.IO, s);
		}
	}
	
	public void nextRow(int sheetIdx){
		row = sheets[sheetIdx].createRow(irows[sheetIdx]);
		irows[sheetIdx]++;
	};
			
	public WB write(int col, Object obj) throws AppException{
		return write(col, obj, null);
	}

	public WB writeE(int col, Object obj) throws AppException{
		return write(col, obj, f1);
	}

	public WB writeK(int col, Object obj) throws AppException{
		return write(col, obj, f2);
	}

	private WB write(int col, Object obj, CellStyle f) throws AppException{
		if (obj == null) return this;
		org.apache.poi.ss.usermodel.Cell cell = row.createCell((short) col);
		if (col > maxCol)
			maxCol = col;
		try {
			if (obj instanceof String) {
				cell.setCellValue((String) obj);
			} else if (obj instanceof Double) {
				cell.setCellValue((Double) obj);
				if (f != null)
					cell.setCellStyle(f);
			} else if (obj instanceof Long) {
				cell.setCellValue(new Double((Long) obj));
				if (f != null)
					cell.setCellStyle(f);
			} else if (obj instanceof Date) {
				cell.setCellValue((Date)obj);
				cell.setCellStyle(f3);
			}
		} catch (Exception e) {
			String s = e.toString();
			throw new AppException(MF.IO, s);
		}
		return this;
	}

	public void setCols(int[] cols, int sheetIdx){
		for(int c = 0; c < cols.length; c++){
	        /* Every character is 256 units wide, so scale it. */
			sheets[sheetIdx].setColumnWidth(c, cols[c] * 256 + 100);					
		}
	}
	
	public void close() throws AppException{
		try {
			workbook.write(os);
		} catch (IOException e) {
			String s = e.toString();
			throw new AppException(MF.IO, s);
		}
	}
	
}
