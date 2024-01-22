import { Controller } from 'egg';

// 校验方法中参数的类型
export type CheckFunc<T> = (paramVal: T) => boolean;

/**
 * x：就是参数的名称
 * value则是一个函数，该函数的参数则是这个参数对应的值（返回true/false）
 * 参考：
 * @ParamValid({
    message: valid<string>([notBlank()]),
  })
 */
interface ParamEntity {
  [x: string]: (paramVal: any) => boolean;
}

export function preAction(preFn: any): any {
  /**
     * _target:目标对象
     * _name：目标属性名称
     * descriptor描述符，包含目标的全部属性
     */
  return function(_target: any, _name: any, descriptor: PropertyDescriptor): any {
    // 获取旧属性值
    const oldValue = descriptor.value;
    descriptor.value = function(...args: any) {
      // 执行preFn函数，查看这个参数是否校验通过，若某个参数不通过，则后续的就因短路运算就不走了
      const isContinueFlag = preFn?.apply(this, args);
      return isContinueFlag && oldValue.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * T:校验的参数的类型
 * paramVal:我们传入的需要校验的前端参数
 */
export function valid<T>(rules: CheckFunc<T>[]): (paramVal: T) => boolean {
  return (paramVal: T) => rules.reduce<boolean>((prev: boolean, curr) => { return prev ? curr(paramVal) : prev; }, true);
}

export function ParamValid(paramEntity: ParamEntity) {
  return preAction(function(this: Controller) {
    // 前端请求参数体
    const requestBodyFromFront = this.ctx.request.body;
    // 校验注解中传入的参数数组
    const paramNames: string[] = Object.keys(paramEntity);
    const result: boolean = paramNames.reduce<boolean>((prev: boolean, paramName) => {
      // 根据参数名称去获得对应 前端请求体中 对应参数的值
      const paramVal = requestBodyFromFront[paramName];
      // 获得对应的校验API（对应上述的valid方法）
      const checkFunc = paramEntity[paramName];
      // 若不通过校验，则后续的方法就不执行了
      return prev ? checkFunc(paramVal) : prev;
    }, true);
    if (result === false) {
      this.ctx.body = {
        content: '参数不合法',
        success: false,
      };
    } else {
      this.ctx.body = {
        success: true,
      };
    }
    return result;
  });
}

export const notBlank = (): CheckFunc<string> => (str: string) => str?.trim().length > 0;
