import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProfilePictureService {
  private readonly STORAGE_KEY_PREFIX = 'profile_pic_';

  updateProfilePicture(userId: number, imageData: string): void {
    localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${userId}`, imageData);
  }

  getProfilePicture(userId: number): string | null {
    return localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${userId}`);
  }

  removeProfilePicture(userId: number): void {
    localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${userId}`);
  }
}