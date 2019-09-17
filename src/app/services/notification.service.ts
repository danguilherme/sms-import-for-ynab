import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {concat, defer, Observable, Subject} from 'rxjs';
import {concatMap, map} from 'rxjs/operators';

export interface SystemNotification {
  title: string;
  package: string;
  text: string;
  textLines: string;
}

export interface Notification extends SystemNotification {
  date: Date;
}

export interface NotificationListenerPlugin {
  listen: (
    success: (notification: SystemNotification) => void,
    error: (error: Error) => void
  ) => void;
}

declare var notificationListener: NotificationListenerPlugin;

const asSequence = concatMap((x: any[]) => x);

@Injectable()
export class NotificationService {
  private notification$ = new Subject<Notification>();

  public newNotification$: Observable<
    Notification
  > = this.notification$.asObservable();

  public allNotification$: Observable<Notification> = concat(
    this.getExampleNotifications().pipe(asSequence),
    this.newNotification$
  );

  get notificationListener() {
    if (!('notificationListener' in window)) {
      return (
        (window as any).notificationListener ||
        ((window as any).notificationListener = createNotificationListenerMockForBrowser())
      );
    }

    return notificationListener;
  }

  constructor(private storage: Storage) {}

  public startListening() {
    this.notificationListener.listen(
      this.onNewNotification.bind(this),
      this.onNotificationListenerError.bind(this)
    );
  }

  private onNewNotification(notification: SystemNotification) {
    const appNotification: Notification = {...notification, date: new Date()};

    this.updateExampleNotifications(appNotification);
    this.notification$.next(appNotification);
  }

  private onNotificationListenerError(error: Error) {
    console.error(error);
  }

  private updateExampleNotifications(newNotification: Notification) {
    this.getExampleNotifications()
      .pipe(map(notifications => [...notifications, newNotification]))
      .subscribe(this.setExampleNotifications.bind(this));
  }

  private getExampleNotifications(): Observable<Notification[]> {
    return defer(() =>
      this.storage.get('exampleNotifications').then(val => val || [])
    );
  }

  private setExampleNotifications(
    notifications: Notification[]
  ): Observable<void> {
    return defer(() => this.storage.set('exampleNotifications', notifications));
  }
}

function createNotificationListenerMockForBrowser(): NotificationListenerPlugin {
  return {
    listen: (success, error) =>
      success({
        title: 'N26',
        text:
          'Your money beam of 8,80 to Anas Aboudeine has not been accepted.',
        textLines: '',
        package: 'com.n26.app'
      })
  };
}
