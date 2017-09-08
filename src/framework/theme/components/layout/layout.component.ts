/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import {
  AfterViewInit,
  Component,
  ComponentFactoryResolver,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  Renderer2,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/filter';

import { convertToBoolProperty } from '../helpers';
import { NbThemeService } from '../../services/theme.service';
import { NbSpinnerService } from '../../services/spinner.service';

/**
 * A container component which determines a content position inside of the layout.
 * The layout could contain unlimited columns (not including the sidebars).
 *
 * @example By default the columns are ordered from the left to the right,
 * but it's also possible to overwrite this behavior by setting a `left` attribute to the column,
 * moving it to the very first position:
 * ```
 * <nb-layout>
 *   <nb-layout-column>Second</nb-layout-column>
 *   <nb-layout-column>Third</nb-layout-column>
 *   <nb-layout-column left>First</nb-layout-column>
 * </nb-layout>
 * ```
 */
@Component({
  selector: 'nb-layout-column',
  template: `
    <ng-content></ng-content>
  `,
})
export class NbLayoutColumnComponent {

  @HostBinding('class.left') leftValue: boolean;

  /**
   * Move the column to the very left position in the layout.
   * @param {boolean} val
   */
  @Input()
  set left(val: boolean) {
    this.leftValue = convertToBoolProperty(val);
  }
}

/**
 * Page header component.
 * Located on top of the page above the layout columns and sidebars.
 * Could be made `fixed` by setting the corresponding property. In the fixed mode the header becomes
 * sticky to the top of the nb-layout (to of the page).
 */
@Component({
  selector: 'nb-layout-header',
  template: `
    <nav [class.fixed]="fixedValue">
      <ng-content></ng-content>
    </nav>
  `,
})
export class NbLayoutHeaderComponent {

  @HostBinding('class.fixed') fixedValue: boolean;

  /**
   * Makes the header sticky to the top of the nb-layout.
   * @param {boolean} val
   */
  @Input()
  set fixed(val: boolean) {
    this.fixedValue = convertToBoolProperty(val);
  }
}

/**
 * Page footer.
 * Located under the nb-layout content (specifically, under the columns).
 * Could be made `fixed`, becoming sticky to the bottom of the view port (window).
 */
@Component({
  selector: 'nb-layout-footer',
  template: `
    <nav [class.fixed]="fixedValue">
      <ng-content></ng-content>
    </nav>
  `,
})
export class NbLayoutFooterComponent {

  @HostBinding('class.fixed') fixedValue: boolean;

  /**
   * Makes the footer sticky to the bottom of the window.
   * @param {boolean} val
   */
  @Input()
  set fixed(val: boolean) {
    this.fixedValue = convertToBoolProperty(val);
  }

}

/**
 * The general Nebular component-container.
 * It is required that all children component of the framework are located inside of the nb-layout.
 *
 * Can contain the following components inside:
 * ```
 * nb-layout-header
 * nb-layout-column
 * nb-sidebar
 * nb-layout-footer
 * ```
 * By default the layout fills up the full view-port.
 * The window scrollbars are disabled on the body and moved inside of the nb-layout, so that the scrollbars
 * won't mess with the fixed nb-header.
 *
 * @example A simple layout example:
 * ```
 * <nb-layout>
 *   <nb-layout-header>Great Company</nb-layout-header>
 *
 *   <nb-layout-column>
 *     Hello World!
 *   </nb-layout-column>
 *
 *   <nb-layout-footer>Contact us</nb-layout-footer>
 * </nb-layout>
 * ```
 *
 * The children components are project into the flexible layout structure allowing to adjust the layout behavior
 * based on the settings provided.
 *
 * @example For example, it is possible to ask the layout to center the columns (notice: we added a `center` attribute
 * to the layout:
 * ```
 * <nb-layout center>
 *   <nb-layout-header>Great Company</nb-layout-header>
 *
 *   <nb-layout-column>
 *     Hello World!
 *   </nb-layout-column>
 *
 *   <nb-layout-footer>Contact us</nb-layout-footer>
 * </nb-layout>
 * ```
 * Now the layout content (columns) becomes centered when the window width is more than
 * the value specified in the theme variable `layout-content-width` (900px by default).
 *
 * The layout also contains the area on the very top (the first child of the nb-layout), which could be used
 * to dynamically append some components like modals or spinners/loaders
 * so that they are located on top of the elements hierarchy.
 * More details are below under the `ThemeService` section.
 *
 * The layout component is also responsible for changing of the application themes.
 * It listens to the `themeChange` event and change the theme CSS class appended to body.
 * Based on the class appended a specific CSS-theme is applied to the application.
 * More details of the Theme System could be found here TODO: link.
 *
 * TODO: theme variables
 *
 */
@Component({
  selector: 'nb-layout',
  styleUrls: ['./layout.component.scss'],
  template: `
    <ng-template #layoutTopDynamicArea></ng-template>
    <div class="scrollable-container">
      <div class="layout">
        <ng-content select="nb-layout-header"></ng-content>
        <div class="layout-container">
          <ng-content select="nb-sidebar"></ng-content>
          <div class="content" [class.center]="centerValue">
            <div class="columns">
              <ng-content select="nb-layout-column"></ng-content>
            </div>
            <ng-content select="nb-layout-footer"></ng-content>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class NbLayoutComponent implements OnDestroy, AfterViewInit {

  centerValue: boolean = false;
  @HostBinding('class.window-mode') windowModeValue: boolean = false;
  @HostBinding('class.with-scroll') withScrollValue: boolean = false;

  /**
   * Defines whether the layout columns will be centered after some width
   * @param {boolean} val
   */
  @Input()
  set center(val: boolean) {
    this.centerValue = convertToBoolProperty(val);
  }

  /**
   * Defines whether the layout enters a 'window' mode, when the layout content (including sidebars and fixed header)
   * becomes centered by width with a margin from the top of the screen, like a floating window.
   * Automatically enables `withScroll` mode, as in the window mode scroll must be inside the layout and cannot be on
   * window. (TODO: check this)
   * @param {boolean} val
   */
  @Input()
  set windowMode(val: boolean) {
    this.windowModeValue = convertToBoolProperty(val);
    this.withScroll = true;
  }

  /**
   * Defines whether to move the scrollbars to layout or leave it at the body level.
   * Automatically set to true when `windowMode` is enabled.
   * @param {boolean} val
   */
  @Input()
  set withScroll(val: boolean) {
    this.withScrollValue = convertToBoolProperty(val);

    // TODO: is this the best way of doing it? as we don't have access to body from theme styles
    // TODO: add e2e test
    const body = document.getElementsByTagName('body')[0];
    if (this.withScrollValue) {
      this.renderer.setStyle(body, 'overflow', 'hidden');
    } else {
      this.renderer.setStyle(body, 'overflow', 'initial');
    }
  }

  @ViewChild('layoutTopDynamicArea', { read: ViewContainerRef }) veryTopRef: ViewContainerRef;

  protected afterViewInit$ = new BehaviorSubject(null);

  protected appendClassSubscription: Subscription;
  protected removeClassSubscription: Subscription;
  protected themeSubscription: Subscription;
  protected appendSubscription: Subscription;
  protected clearSubscription: Subscription;

  constructor(protected themeService: NbThemeService,
              protected spinnerService: NbSpinnerService,
              protected componentFactoryResolver: ComponentFactoryResolver,
              protected elementRef: ElementRef,
              protected renderer: Renderer2) {

    this.themeSubscription = this.themeService.onThemeChange().subscribe((theme) => {

      const body = document.getElementsByTagName('body')[0];
      if (theme.previous) {
        this.renderer.removeClass(body, `nb-theme-${theme.previous}`);
      }
      this.renderer.addClass(body, `nb-theme-${theme.name}`);
    });

    this.appendClassSubscription = this.themeService.onAppendLayoutClass().subscribe((className) => {
      this.renderer.addClass(this.elementRef.nativeElement, className);
    });

    this.removeClassSubscription = this.themeService.onRemoveLayoutClass().subscribe((className) => {
      this.renderer.removeClass(this.elementRef.nativeElement, className);
    });

    this.spinnerService.registerLoader(new Promise((resolve, reject) => {
      this.afterViewInit$.subscribe((_) => resolve());
    }));
    this.spinnerService.load();

    // trigger first time so that after the change we have the initial value
    this.themeService.changeWindowWidth(window.innerWidth);
  }

  ngAfterViewInit(): void {
    this.appendSubscription = this.themeService.onAppendToTop()
      .subscribe((data: { component: any, listener: Subject<any> }) => {
        const componentFactory = this.componentFactoryResolver.resolveComponentFactory(data.component);
        const componentRef = this.veryTopRef.createComponent(componentFactory);
        data.listener.next(componentRef);
        data.listener.complete();
      });

    this.clearSubscription = this.themeService.onClearLayoutTop()
      .subscribe((data: { listener: Subject<any> }) => {
        this.veryTopRef.clear();
        data.listener.next(true);
      });

    this.afterViewInit$.next(true);
  }

  ngOnDestroy(): void {
    this.themeService.clearLayoutTop();
    this.themeSubscription.unsubscribe();
    this.appendClassSubscription.unsubscribe();
    this.removeClassSubscription.unsubscribe();
    this.appendSubscription.unsubscribe();
    this.clearSubscription.unsubscribe();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.themeService.changeWindowWidth(event.target.innerWidth);
  }
}
