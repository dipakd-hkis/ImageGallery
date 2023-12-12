import { Component, ElementRef, ViewChild } from '@angular/core';
import { UploadImageService } from '../upload-image.service';
import { S3 } from 'aws-sdk';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as firebase from "firebase/app";
import { equalTo, getDatabase, limitToFirst, onValue, orderByChild, query, ref, startAfter } from "firebase/database";
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { provideAnimations } from '@angular/platform-browser/animations';
import { NgxMasonryComponent, NgxMasonryModule, NgxMasonryOptions } from 'ngx-masonry';
import { environment } from '../../environments/environment';

declare var jQuery: any;

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule, InfiniteScrollModule, NgxMasonryModule],
  providers: [provideAnimations()],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.css'
})
export class ImageUploadComponent {

  public masonryOptions: NgxMasonryOptions = {
    gutter: 10,
    itemSelector: ".masonry-item",
    columnWidth: ".masonry-item",
    horizontalOrder: true,
    percentPosition: true,
    animations: {},
    resize: true
  };

  @ViewChild('hashtagsInput') hashtagsInput!: ElementRef;

  @ViewChild(NgxMasonryComponent, { static: false })
  public masonry!: NgxMasonryComponent;

  private selectedFiles: any = '';
  public imageSrc: string = '';
  public progress: any = "";

  public tagArray: string[] = [];
  public currentTag: string = '';

  public isTagError: boolean = false;
  public isTitleError: boolean = false;
  public isPathError: boolean = false;
  public isSaveError: boolean = false;
  public isUploadError: boolean = false;
  public isImageTypeError: boolean = false;

  private app: any;
  public imageList: any;
  public pageNumber: number = 0;
  public imageListObject: any;
  public GalleryImage: FormGroup;
  public galleryList: any;
  public loadingConversations: any;
  public totalConvPageCount: any;
  public currentConvPageNumber: any;
  public isRecord: boolean = false;

  constructor(private uploadService: UploadImageService,
    private formBuilder: FormBuilder,
    private httpclient: HttpClient,) {
    this.GalleryImage = this.formBuilder.group({

      'title': ['', [Validators.required]],
      'tag': [''],
      'path': ['', [Validators.required]]
    });
  }

  async ngOnInit() {
    this.app = firebase.initializeApp(environment.firebaseConfig);
    var db1 = getDatabase(this.app);
    this.pageNumber++;
    const starCountRef = query(ref(db1, 'Gallery'), limitToFirst(this.pageNumber * 10));
    onValue(starCountRef, (snapshot) => {
      this.imageListObject = snapshot.val();
      this.imageList = Object.values(this.imageListObject);
      this.galleryList = Object.values(this.imageListObject);

    });
  }


  async ngSubmit() {
    if (this.GalleryImage.controls['path'].value == null || this.GalleryImage.controls['path'].value == "") {
      this.isPathError = true;
    }
    if (this.imageSrc == null || this.imageSrc == "") {
      this.isPathError = true;
    }
    else {
      this.isPathError = false;
      await this.upload();
    }
    if (this.GalleryImage.controls['title'].value == null || this.GalleryImage.controls['title'].value == "") {
      this.isTitleError = true;
    }

    // if (this.GalleryImage.valid) {
    //   this.httpclient.post('https://imagegallery-548b9-default-rtdb.firebaseio.com/Gallery.json',
    //     this.GalleryImage.value
    //   ).subscribe(response => {
    //     this.GalleryImage.reset();
    //     jQuery(".btn-close").click();
    //   },
    //     (error) => {
    //       this.isSaveError = true;
    //     });
    // }
  }


  public onScroll() {
    this.pageNumber++;
    this.app = firebase.initializeApp(environment.firebaseConfig);
    var db1 = getDatabase(this.app);
    const starCountRef = query(ref(db1, 'Gallery'), limitToFirst(this.pageNumber * 10));
    onValue(starCountRef, (snapshot) => {
      this.imageListObject = snapshot.val();
      var newImageList = Object.values(this.imageListObject);
      var newList: any[] = [];
      newImageList.forEach((value: any) => {
        if (this.galleryList.find((x: any) => x.path == value.path) == undefined) {
          newList.push(value);
        }
      });
      this.imageList = [...this.imageList, ...newList]
      this.imageList = this.imageList.filter(function (itm: any, i: any, a: string | any[]) {
        return i == a.indexOf(itm);
      });

      this.galleryList = Object.values(this.imageListObject);
    });
  }

  public addHashtag() {
    const hashtagValue = this.currentTag.trim();
    if (hashtagValue.length > 0) {
      if (!this.tagArray.includes(hashtagValue)) {
        this.tagArray.push(hashtagValue);
        this.currentTag = '';
        this.isTagError = false;
      }
      else {
        this.isTagError = true;
      }
    }
  }

  public removeHashtag(hashtag: string) {
    const index = this.tagArray.indexOf(hashtag);
    if (index !== -1) {
      this.tagArray.splice(index, 1);
    }
  }

  public async upload() {
    this.progress = "0%";
    const file = this.selectedFiles;
    const contentType = file.type;
    const bucket = new S3({
      accessKeyId: environment.accessKeyId,
      secretAccessKey: environment.secretAccessKey,
      region: environment.region
    });
    const params = {
      Bucket: environment.bucketName,
      Key: environment.folderName + file.name,
      Body: file,
      ACL: 'public-read',
      ContentType: contentType
    };

    await bucket.upload(params).on('httpUploadProgress', (evt) => {
      const percent = Math.round(
        (100 * evt.loaded) / evt.total
      );
      this.progress = percent;
      if (this.progress === 100) {
        this.progress = this.progress + "%";
        setTimeout(() => {
          this.progress = "Completed...";
        }, 0);
      } else {
        this.progress = this.progress + "%";
      }
    }).send((err: any, data: any) => {
      if (data) {
        this.GalleryImage.controls['path'].setValue(data.Location);
        this.imageSubmit();
        return true;
      }
      else {
        this.isUploadError = true;
        return false;
      }
    });
  }

  public openAddModal() {
    this.GalleryImage.reset();
    this.imageSrc = '';
    this.tagArray = [];
    this.isTitleError = false;
    this.isPathError = false;
    this.isTagError = false;
    this.isImageTypeError = false;
    this.isSaveError = false;
    this.isUploadError = false;
  }

  public closeModal() {
    this.GalleryImage.reset();
    this.imageSrc = '';
    this.tagArray = [];
    this.isTitleError = false;
  }

  public removeImage() {
    this.imageSrc = '';
  }

  public searchFilter(event: any) {
    if (event.target.value != "" && event.target.value != null) {
      this.app = firebase.initializeApp(environment.firebaseConfig);
      var db1 = getDatabase(this.app);
      const starCountRef = query(ref(db1, 'Gallery'), orderByChild('title'), equalTo(event.target.value));
      onValue(starCountRef, (snapshot) => {
        this.imageListObject = snapshot.val();
        if (this.imageListObject == null) {
          this.isRecord = true;
        } else {
          this.isRecord = false;
          this.imageList = Object.values(this.imageListObject);
          this.masonry.reloadItems();
        }

      });
    } else {
      this.isRecord = false;
      this.imageList = this.galleryList;
    }
  }

  public selectFile(event: any) {
    let reader = new FileReader();
    let file = event.target.files[0];
    if (file.size <= 20000000) {
      this.isUploadError = false;
      if (file.type == "image/jpg" || file.type == "image/jpeg" || file.type == "image/png") {
        this.isImageTypeError = false;
        if (event.target.files && event.target.files.length) {
          this.isPathError = false;
          reader.readAsDataURL(file);
          reader.onload = () => {
            this.selectedFiles = file;
            this.imageSrc = reader.result as string;
          }
        }
      } else {
        this.isImageTypeError = true;
      }
    }
    else {
      this.isUploadError = true;
    }
  }

  public imageSubmit() {
    this.GalleryImage.controls['tag'].setValue(this.tagArray);
    if (this.GalleryImage.valid) {
      this.httpclient.post('https://imagegallery-548b9-default-rtdb.firebaseio.com/Gallery.json',
        this.GalleryImage.value
      ).subscribe(response => {
        this.GalleryImage.reset();
        jQuery(".btn-close").click();
      },
        (error) => {
          this.isSaveError = true;
        });
    }
  }

}
