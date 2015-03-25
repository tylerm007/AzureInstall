var gulp = require('gulp'),
	concat = require('gulp-concat'),
	usemin = require('gulp-usemin'),
	inject = require('gulp-inject');

gulp.task('default', ['usemin']);

gulp.task('usemin', function () {
	console.log('disabled');
	return;
	return gulp.src('index.html')
		.pipe(usemin({
			css: ['concat'],
			js: ['concat']
		}))
		.pipe(gulp.dest('./'));
});