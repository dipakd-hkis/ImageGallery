import { Injectable } from '@angular/core';
import { S3 } from 'aws-sdk';

@Injectable({
  providedIn: 'root'
})
export class UploadImageService {

  constructor() { }


  uploadFile(file: any) {
    const contentType = file.type;
    const bucket = new S3({
      accessKeyId: 'AKIA6F2NYJRNBTQQNI5R',
      secretAccessKey: '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',
      region: 'ap-southeast-1'
    });
    const params = {
      Bucket: 'image-gallery-1',
      Key: file.name,
      Body: file,
      ACL: 'public-read',
      ContentType: contentType
    };
    bucket.upload(params, function (err: any, data: any) {
      if (err) {
        console.log('There was an error uploading your file: ', err);
        return false;
      }
      console.log('Successfully uploaded file.', data);
      return true;
    });
    //for upload progress   
    bucket.upload(params).on('httpUploadProgress', function (evt) {
      const percentDone = Math.round(
        (100 * evt.loaded) / evt.total
      );
      console.log(percentDone);
    }).send(function (err: any, data: any) {
      if (err) {
        console.log('There was an error uploading your file: ', err);
        return false;
      }
      console.log('Successfully uploaded file.', data);
      return true;
    });
  }
}
