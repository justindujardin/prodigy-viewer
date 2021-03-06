prodigy-viewer
---

A not very polished app for reviewing and changing prodigy annotations
after a session.

### Features
 
 - View and change answers on prodigy annotations
 - Filter examples by a search input value
 - @angular + @angular/material + @angular/flex-layout


### Getting Started

Install [electron-forge](https://electronforge.io/), which is a CLI tool for building our electron app.

```bash
npm i -g electron-forge
```

Start the app:

```bash
electron-forge start
```

You should see something like:
![prodigy-viewer](https://github.com/justindujardin/prodigy-viewer/blob/d9e6db8588b927bc5e1a4915ce8ee599901fdf4a/example/screenshot.png)



### Known Issues

 - No open/close database functionality. Users have to set db path in `home.comoponent.ts` for now
 - No release builds. You have to install `electron-forge` and run the app locally.
 - Manipulates sqlite directly. No support for other prodigy db types.
 - No integration with ngrx/store because @justindujardin is lazy


Enjoy.


