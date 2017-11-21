package fr.hypertable;

import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME) @Target(ElementType.FIELD) public @interface HT {
	int id();

	boolean persist() default true;

	boolean hidden() default false;
}
