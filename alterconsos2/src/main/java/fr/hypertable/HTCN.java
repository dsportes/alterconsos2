package fr.hypertable;

import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME) @Target(ElementType.TYPE) public @interface HTCN {
	int id();

	boolean persist() default true;

	char single() default '\u0000';

	int model() default 0;
}
