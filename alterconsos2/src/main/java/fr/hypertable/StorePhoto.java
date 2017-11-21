package fr.hypertable;

import com.Ostermiller.util.Base64;
import com.google.appengine.api.images.Image;
import com.google.appengine.api.images.ImagesService;
import com.google.appengine.api.images.ImagesServiceFactory;
import com.google.appengine.api.images.Transform;

import fr.hypertable.AppTransaction.StatusPhase;

public class StorePhoto extends Operation {

	public String line;
	public String column;
	String content;
	String mime;
	String prefix;
	byte[] newImageData;
	Archive archive;

	@Override public String mainLine() {
		return line;
	}

	@Override public StatusPhase phaseFaible() throws AppException {
		column = arg().getS("c");
		line = arg().getS("l");
		content = arg().getS("content");
		mime = arg().getS("mime");
		prefix = "data:" + mime + ";base64,";

		byte[] oldImageData = null;
		newImageData = null;
		try {
			oldImageData = Base64
					.decodeToBytes(content.substring(prefix.length(), content.length()));
			ImagesService imagesService = ImagesServiceFactory.getImagesService();
			Image oldImage = ImagesServiceFactory.makeImage(oldImageData);
			Transform resize = ImagesServiceFactory.makeResize(256, 256, (double) (0.5),
					(double) (0.5));
			Image newImage = imagesService.applyTransform(resize, oldImage);
			newImageData = newImage.getImageData();
		} catch (Exception e) {
			throw new AppException(e, MF.PHOTO, mime);
		}
		archive = new Archive(line, column, "PHOTO", mime, newImageData, 0);
		return StatusPhase.transactionSimple;
	}

	@Override public void phaseForte() throws AppException {
		archive.putArchiveInStorage();
	}

}
